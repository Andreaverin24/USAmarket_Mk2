import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DatabaseService } from '../../common/database.service.js';
import { appConfig } from '../../config.js';
import { TenantService } from '../tenancy/tenant.service.js';
import { validateMediaUpload, type MediaUploadInput } from './media-validation.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
  ) {}

  async uploadUrl(
    userId: string,
    organizationId: string,
    productId: string,
    input: MediaUploadInput,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    const validated = validateMediaUpload(input);
    const product = await this.db.product.findFirst({
      where: { id: productId, organizationId: tenant.organizationId },
      select: { id: true, title: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    const storageKey = `organizations/${tenant.organizationId}/products/${product.id}/original/${randomUUID()}.${validated.extension}`;
    const media = await this.db.productMedia.create({
      data: {
        organizationId: tenant.organizationId,
        productId: product.id,
        storageKey,
        mimeType: validated.mimeType,
        checksum: input.checksum.toLowerCase(),
        byteSize: input.size,
        originalFilename: input.filename,
        altText: product.title,
        processingStatus: 'UPLOADING',
      },
    });
    const client = this.s3();
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: appConfig().S3_BUCKET,
        Key: storageKey,
        ContentType: validated.mimeType,
        ContentLength: input.size,
        Metadata: { checksum: input.checksum.toLowerCase() },
      }),
      { expiresIn: 600 },
    );
    client.destroy();
    return { mediaId: media.id, uploadUrl, storageKey, expiresInSeconds: 600 };
  }

  async complete(userId: string, organizationId: string, productId: string, mediaId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    const media = await this.db.productMedia.findFirst({
      where: { id: mediaId, productId, organizationId: tenant.organizationId },
    });
    if (!media) throw new NotFoundException('Product media not found');
    if (media.processingStatus !== 'UPLOADING') return media;
    if (!media.storageKey || !media.mimeType || !media.checksum || !media.byteSize)
      throw new ConflictException('Media upload metadata is incomplete');
    const client = this.s3();
    let head;
    try {
      head = await client.send(
        new HeadObjectCommand({ Bucket: appConfig().S3_BUCKET, Key: media.storageKey }),
      );
    } finally {
      client.destroy();
    }
    if (head.ContentLength !== media.byteSize)
      throw new ConflictException('Uploaded media size mismatch');
    if (head.ContentType !== media.mimeType)
      throw new ConflictException('Uploaded media MIME mismatch');
    if (head.Metadata?.checksum?.toLowerCase() !== media.checksum.toLowerCase())
      throw new ConflictException('Uploaded media checksum metadata mismatch');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.productMedia.update({
        where: { id: media.id },
        data: { processingStatus: 'PENDING', processingError: null },
      });
      await tx.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId: userId,
          action: 'catalog.media.upload.completed',
          resourceType: 'ProductMedia',
          resourceId: media.id,
          correlationId: randomUUID(),
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'ProductMedia',
          aggregateId: media.id,
          eventType: 'catalog.media.processing-requested',
          payload: { mediaId: media.id },
        },
      });
      return updated;
    });
  }

  async update(
    userId: string,
    organizationId: string,
    productId: string,
    mediaId: string,
    input: {
      altText?: string | undefined;
      sortOrder?: number | undefined;
      isPrimary?: boolean | undefined;
    },
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    const media = await this.db.productMedia.findFirst({
      where: { id: mediaId, productId, organizationId: tenant.organizationId },
    });
    if (!media) throw new NotFoundException('Product media not found');
    return this.db.$transaction(async (tx) => {
      if (input.isPrimary)
        await tx.productMedia.updateMany({
          where: { productId, organizationId: tenant.organizationId, id: { not: media.id } },
          data: { isPrimary: false },
        });
      return tx.productMedia.update({
        where: { id: media.id },
        data: Object.fromEntries(Object.entries(input).filter((entry) => entry[1] !== undefined)),
      });
    });
  }

  private s3() {
    const config = appConfig();
    return new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    });
  }
}
