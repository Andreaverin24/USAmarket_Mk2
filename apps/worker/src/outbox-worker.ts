import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import sharp from 'sharp';
import { PrismaClient } from '@atlas/database';
import { createLogger } from '@atlas/observability';
import type { AppConfig } from '@atlas/config';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  processImportJob,
  processWebExtractionJob,
  sniffImageMime,
} from '@atlas/catalog';
import { createWebCaptureSession } from './web-browser.js';

const logger = createLogger('outbox-worker');

export function startOutboxWorker(config: AppConfig) {
  const producerConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const consumerConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('atlas-outbox', { connection: producerConnection });
  const db = new PrismaClient();
  const worker = new Worker(
    'atlas-outbox',
    async (job) => {
      const event = await db.outboxEvent.findUnique({ where: { id: job.data.eventId as string } });
      if (!event || event.processedAt) return;
      if (event.eventType === 'catalog.media.import-requested')
        await importMedia(db, config, event.aggregateId);
      else if (event.eventType === 'catalog.media.processing-requested')
        await processMedia(db, config, event.aggregateId);
      else if (event.eventType === 'catalog.import.requested')
        await processImportJob(db, event.aggregateId, `outbox-${event.id}`);
      else if (event.eventType === 'catalog.web-extraction.requested') {
        const importJob = await db.importJob.findUniqueOrThrow({
          where: { id: event.aggregateId },
        });
        const mapping = importJob.mapping as { siteUrl?: unknown } | null;
        if (typeof mapping?.siteUrl !== 'string') throw new Error('Web import site URL is missing');
        const capture = createWebCaptureSession(mapping.siteUrl);
        try {
          await processWebExtractionJob(db, importJob.id, capture.capture);
        } finally {
          await capture.close();
        }
      } else if (
        event.eventType.startsWith('dealer.application.') ||
        event.eventType.startsWith('catalog.product.')
      )
        await materializeNotifications(db, event);
      else if (
        !event.eventType.startsWith('foundation.') &&
        !event.eventType.startsWith('catalog.product.')
      )
        throw new Error(`Unsupported event: ${event.eventType}`);
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), lockedAt: null, lastError: null },
      });
      logger.info({ eventId: event.id, eventType: event.eventType }, 'Outbox event processed');
    },
    { connection: consumerConnection, concurrency: 5 },
  );
  worker.on('failed', (job, error) => {
    if (!job) return;
    void db.outboxEvent.updateMany({
      where: { id: job.data.eventId as string, processedAt: null },
      data: {
        lastError: error.message.slice(0, 1000),
        lockedAt: null,
        availableAt: new Date(Date.now() + 60_000),
      },
    });
  });
  const poll = async () => {
    const events = await db.outboxEvent.findMany({
      where: {
        processedAt: null,
        availableAt: { lte: new Date() },
        OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 60_000) } }],
      },
      orderBy: { occurredAt: 'asc' },
      take: 50,
    });
    for (const event of events) {
      const claimed = await db.outboxEvent.updateMany({
        where: {
          id: event.id,
          processedAt: null,
          OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 60_000) } }],
        },
        data: { lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (claimed.count)
        await queue.add(
          event.eventType,
          { eventId: event.id },
          {
            jobId: event.id,
            removeOnComplete: 1000,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
          },
        );
    }
  };
  const timer = setInterval(
    () => void poll().catch((error) => logger.error({ error }, 'Outbox poll failed')),
    1000,
  );
  void poll();
  return async () => {
    clearInterval(timer);
    await worker.close();
    await queue.close();
    await producerConnection.quit();
    await consumerConnection.quit();
    await db.$disconnect();
  };
}

async function materializeNotifications(
  db: PrismaClient,
  event: {
    id: string;
    organizationId: string | null;
    eventType: string;
    payload: unknown;
  },
) {
  const payload =
    typeof event.payload === 'object' && event.payload !== null
      ? (event.payload as Record<string, unknown>)
      : {};
  const recipients = new Set<string>();
  if (event.eventType === 'dealer.application.submitted') {
    const reviewers = await platformRecipients(db, 'dealer:review');
    reviewers.forEach((userId) => recipients.add(userId));
  } else if (event.eventType.startsWith('dealer.application.')) {
    const applicantUserId = payload.applicantUserId;
    if (typeof applicantUserId === 'string') recipients.add(applicantUserId);
  } else if (event.eventType === 'catalog.product.submitted') {
    const moderators = await platformRecipients(db, 'catalog:moderate');
    moderators.forEach((userId) => recipients.add(userId));
  } else if (
    ['catalog.product.reject', 'catalog.product.approve', 'catalog.product.publish'].includes(
      event.eventType,
    ) &&
    event.organizationId
  ) {
    const members = await organizationRecipients(db, event.organizationId, 'catalog:submit');
    members.forEach((userId) => recipients.add(userId));
  } else if (
    event.eventType === 'catalog.product.moderation_comment' &&
    payload.visibility === 'SELLER' &&
    event.organizationId
  ) {
    const members = await organizationRecipients(db, event.organizationId, 'catalog:submit');
    members.forEach((userId) => recipients.add(userId));
  } else {
    return;
  }
  const content = notificationContent(event.eventType, payload);
  for (const recipientUserId of recipients)
    for (const channel of ['IN_APP', 'EMAIL'] as const)
      await db.notification.upsert({
        where: {
          sourceEventId_recipientUserId_channel: {
            sourceEventId: event.id,
            recipientUserId,
            channel,
          },
        },
        create: {
          organizationId: event.organizationId,
          recipientUserId,
          sourceEventId: event.id,
          channel,
          type: event.eventType,
          subject: content.subject,
          body: content.body,
          payload: payload as never,
          status: channel === 'IN_APP' ? 'DELIVERED' : 'QUEUED',
          ...(channel === 'IN_APP' ? { deliveredAt: new Date() } : {}),
        },
        update: {},
      });
}

async function platformRecipients(db: PrismaClient, permission: string) {
  const memberships = await db.organizationMember.findMany({
    where: {
      status: 'ACTIVE',
      organization: { type: 'PLATFORM', status: 'ACTIVE' },
      role: {
        permissions: {
          some: { permission: { code: { in: ['platform:admin', permission] } } },
        },
      },
    },
    select: { userId: true },
  });
  return memberships.map(({ userId }) => userId);
}

async function organizationRecipients(
  db: PrismaClient,
  organizationId: string,
  permission: string,
) {
  const memberships = await db.organizationMember.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      role: { permissions: { some: { permission: { code: permission } } } },
    },
    select: { userId: true },
  });
  return memberships.map(({ userId }) => userId);
}

function notificationContent(eventType: string, payload: Record<string, unknown>) {
  const reason = typeof payload.reason === 'string' ? ` Reason: ${payload.reason}` : '';
  const content: Record<string, { subject: string; body: string }> = {
    'dealer.application.submitted': {
      subject: 'Dealer application awaiting review',
      body: 'A dealer application has been submitted for platform review.',
    },
    'dealer.application.request_changes': {
      subject: 'Dealer application changes requested',
      body: `The platform requested changes to your dealer application.${reason}`,
    },
    'dealer.application.approve': {
      subject: 'Dealer application approved',
      body: 'Your dealer organization has been approved.',
    },
    'dealer.application.reject': {
      subject: 'Dealer application declined',
      body: `Your dealer application was declined.${reason}`,
    },
    'dealer.application.suspend': {
      subject: 'Dealer account suspended',
      body: `Your dealer account was suspended.${reason}`,
    },
    'catalog.product.submitted': {
      subject: 'Product awaiting moderation',
      body: 'A product has been submitted for moderation.',
    },
    'catalog.product.reject': {
      subject: 'Product changes requested',
      body: `Changes were requested for your product.${reason}`,
    },
    'catalog.product.approve': {
      subject: 'Product approved',
      body: 'Your product was approved and is ready for publication.',
    },
    'catalog.product.publish': {
      subject: 'Product published',
      body: 'Your product is now visible in the marketplace and storefront.',
    },
    'catalog.product.moderation_comment': {
      subject: 'New product moderation comment',
      body: 'A moderator added a comment to your product review.',
    },
  };
  return (
    content[eventType] ?? {
      subject: 'THE GUILD update',
      body: 'An item in your THE GUILD account was updated.',
    }
  );
}

export async function importMedia(db: PrismaClient, config: AppConfig, mediaId: string) {
  const media = await db.productMedia.findUnique({ where: { id: mediaId } });
  if (!media?.sourceUrl) throw new Error('Media source URL missing');
  if (media.processingStatus === 'READY' && media.storageKey && media.checksum) return;
  const url = new URL(media.sourceUrl);
  await assertPublicHost(url.hostname);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.body) throw new Error(`Media download failed: ${response.status}`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!ALLOWED_IMAGE_MIME.includes(mimeType as (typeof ALLOWED_IMAGE_MIME)[number]))
    throw new Error('Unsupported media MIME type');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error('Media exceeds 20 MB');
    }
    chunks.push(result.value);
  }
  const body = Buffer.concat(chunks);
  const sniffedMime = sniffImageMime(body);
  if (sniffedMime !== mimeType) throw new Error('Remote media MIME does not match file signature');
  const checksum = createHash('sha256').update(body).digest('hex');
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]!;
  const storageKey = `organizations/${media.organizationId}/products/${media.productId}/original/${media.id}.${extension}`;
  const client = new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: storageKey,
      Body: body,
      ContentType: mimeType,
      Metadata: { checksum },
    }),
  );
  client.destroy();
  await db.productMedia.update({
    where: { id: media.id },
    data: {
      storageKey,
      mimeType,
      checksum,
      byteSize: body.byteLength,
      processingStatus: 'PENDING',
      processingError: null,
    },
  });
  await processMedia(db, config, media.id, body);
}

export async function processMedia(
  db: PrismaClient,
  config: AppConfig,
  mediaId: string,
  suppliedOriginal?: Buffer,
) {
  const media = await db.productMedia.findUnique({ where: { id: mediaId } });
  if (!media?.storageKey || !media.checksum) throw new Error('Media original is incomplete');
  await db.productMedia.update({
    where: { id: media.id },
    data: { processingStatus: 'PROCESSING', processingError: null },
  });
  const client = s3(config);
  try {
    let original = suppliedOriginal;
    if (!original) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: media.storageKey }),
      );
      if (!object.Body) throw new Error('Media original object is empty');
      const bytes = await object.Body.transformToByteArray();
      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Media exceeds 20 MB');
      original = Buffer.from(bytes);
    }
    const sniffedMime = sniffImageMime(original);
    if (media.mimeType && sniffedMime !== media.mimeType)
      throw new Error('Stored media MIME does not match file signature');
    const checksum = createHash('sha256').update(original).digest('hex');
    if (checksum !== media.checksum) throw new Error('Stored media checksum mismatch');
    const generated = await generateImageVariants(original);
    const rows = [];
    for (const variant of generated.variants) {
      const storageKey = `organizations/${media.organizationId}/products/${media.productId}/variants/${media.id}/${variant.kind.toLowerCase()}.${variant.format}`;
      const variantChecksum = createHash('sha256').update(variant.body).digest('hex');
      await client.send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: storageKey,
          Body: variant.body,
          ContentType: variant.mimeType,
          Metadata: { checksum: variantChecksum, source: media.id },
        }),
      );
      const row = await db.mediaVariant.upsert({
        where: {
          mediaId_kind_format: { mediaId: media.id, kind: variant.kind, format: variant.format },
        },
        create: {
          organizationId: media.organizationId,
          mediaId: media.id,
          kind: variant.kind,
          format: variant.format,
          storageKey,
          mimeType: variant.mimeType,
          width: variant.width,
          height: variant.height,
          byteSize: variant.body.byteLength,
          checksum: variantChecksum,
        },
        update: {
          storageKey,
          mimeType: variant.mimeType,
          width: variant.width,
          height: variant.height,
          byteSize: variant.body.byteLength,
          checksum: variantChecksum,
        },
      });
      rows.push(row);
    }
    await db.productMedia.update({
      where: { id: media.id },
      data: {
        processingStatus: 'READY',
        width: generated.width,
        height: generated.height,
        completedAt: new Date(),
        processingError: null,
        variants: rows.map((row) => ({
          kind: row.kind,
          format: row.format,
          storageKey: row.storageKey,
          width: row.width,
          height: row.height,
        })),
      },
    });
    return rows;
  } catch (error) {
    await db.productMedia.update({
      where: { id: media.id },
      data: {
        processingStatus: 'FAILED',
        processingError: (error instanceof Error ? error.message : 'Media processing failed').slice(
          0,
          1000,
        ),
      },
    });
    throw error;
  } finally {
    client.destroy();
  }
}

export async function generateImageVariants(original: Buffer) {
  const pipeline = sharp(original, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Image dimensions are unavailable');
  const outputs = await Promise.all([
    pipeline
      .clone()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true }),
    pipeline
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true }),
    pipeline
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .avif({ quality: 55, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
  ]);
  return {
    width: metadata.width,
    height: metadata.height,
    variants: [
      {
        kind: 'THUMBNAIL' as const,
        format: 'webp',
        mimeType: 'image/webp',
        body: outputs[0].data,
        width: outputs[0].info.width,
        height: outputs[0].info.height,
      },
      {
        kind: 'OPTIMIZED' as const,
        format: 'webp',
        mimeType: 'image/webp',
        body: outputs[1].data,
        width: outputs[1].info.width,
        height: outputs[1].info.height,
      },
      {
        kind: 'OPTIMIZED' as const,
        format: 'avif',
        mimeType: 'image/avif',
        body: outputs[2].data,
        width: outputs[2].info.width,
        height: outputs[2].info.height,
      },
    ],
  };
}

const s3 = (config: AppConfig) =>
  new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
  });

async function assertPublicHost(hostname: string) {
  if (hostname === 'localhost' || isIP(hostname)) throw new Error('Media host is not public');
  const addresses = await lookup(hostname, { all: true });
  for (const { address } of addresses)
    if (
      /^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(address) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
      address === '::1' ||
      address.startsWith('fc') ||
      address.startsWith('fd') ||
      address.startsWith('fe80:')
    )
      throw new Error('Media host resolves to a private address');
}
