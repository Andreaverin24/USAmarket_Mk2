import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@atlas/database';
import { processImportJob, processWebExtractionJob } from '@atlas/catalog';
import { createWebCaptureSession } from '../src/web-browser.js';

const db = new PrismaClient();
const command = process.argv[2] ?? 'preview';
const suppliedJobId = process.argv[3];
const siteUrl = 'https://www.establishedlines.com/';
const categoryUrl = 'https://www.establishedlines.com/collections/all';

try {
  const organization = await db.organization.findUniqueOrThrow({
    where: { slug: 'established-lines' },
    select: { id: true, slug: true, name: true },
  });
  const membership = await db.organizationMember.findFirstOrThrow({
    where: { organizationId: organization.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  });

  if (command === 'preview') {
    const config = {
      siteUrl,
      categoryUrls: [categoryUrl],
      maxProducts: 30,
      maxCategoryPages: 5,
    };
    const checksum = createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const job = await db.importJob.create({
      data: {
        organizationId: organization.id,
        idempotencyKey: `established-lines-pilot-30-${Date.now()}`,
        source: 'web',
        checksum,
        dryRun: true,
        status: 'PENDING',
        mapping: config,
        requestedByUserId: membership.userId,
        correlationId: randomUUID(),
      },
    });
    const capture = createWebCaptureSession(siteUrl);
    try {
      const result = await processWebExtractionJob(db, job.id, capture.capture);
      printJob(result);
    } finally {
      await capture.close();
    }
  } else if (command === 'apply') {
    if (!suppliedJobId) throw new Error('Usage: pilot-established-lines.ts apply <job-id>');
    const job = await db.importJob.findFirstOrThrow({
      where: {
        id: suppliedJobId,
        organizationId: organization.id,
        source: 'web',
        dryRun: true,
        status: 'VALIDATED',
      },
    });
    if (!job.validRows) throw new Error('Preview has no valid rows');
    const rightsConfirmedAt = new Date();
    const rightsScopeHash = createHash('sha256').update(`${job.id}:${job.checksum}`).digest('hex');
    const mapping =
      job.mapping && typeof job.mapping === 'object' && !Array.isArray(job.mapping)
        ? (job.mapping as Record<string, unknown>)
        : {};
    await db.importJob.update({
      where: { id: job.id },
      data: {
        dryRun: false,
        status: 'PENDING',
        importedRows: 0,
        completedAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: null,
        rightsConfirmedByUserId: membership.userId,
        rightsConfirmedAt,
        rightsScopeHash,
        mapping: {
          ...mapping,
          rightsConfirmed: true,
          rightsConfirmedByUserId: membership.userId,
          rightsConfirmedAt: rightsConfirmedAt.toISOString(),
          rightsScopeHash,
        } as Prisma.InputJsonValue,
      },
    });
    const result = await processImportJob(db, job.id, `pilot-${randomUUID()}`);
    printJob(result);
    const [products, listings, snapshots, evidence, media] = await Promise.all([
      db.product.count({ where: { organizationId: organization.id } }),
      db.externalListing.count({ where: { organizationId: organization.id } }),
      db.listingSnapshot.count({ where: { organizationId: organization.id } }),
      db.productFieldEvidence.count({ where: { organizationId: organization.id } }),
      db.productMedia.count({ where: { organizationId: organization.id } }),
    ]);
    console.log(
      JSON.stringify(
        { organization, totals: { products, listings, snapshots, evidence, media } },
        null,
        2,
      ),
    );
  } else if (command === 'inspect') {
    if (!suppliedJobId) throw new Error('Usage: pilot-established-lines.ts inspect <job-id>');
    const job = await db.importJob.findFirstOrThrow({
      where: { id: suppliedJobId, organizationId: organization.id },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    printJob(job);
  } else {
    throw new Error('Command must be preview, inspect, or apply');
  }
} finally {
  await db.$disconnect();
}

function printJob(job: {
  id: string;
  status: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  failedRows: number;
  lastError?: string | null;
  rows?: Array<{
    rowNumber: number;
    status: string;
    normalizedPayload: unknown;
    errors: unknown;
  }>;
}) {
  const rows = (job.rows ?? []).map((row) => {
    const candidate =
      row.normalizedPayload && typeof row.normalizedPayload === 'object'
        ? (row.normalizedPayload as Record<string, unknown>)
        : {};
    const listing =
      candidate.listing && typeof candidate.listing === 'object'
        ? (candidate.listing as Record<string, unknown>)
        : {};
    return {
      rowNumber: row.rowNumber,
      status: row.status,
      title: candidate.title,
      sku: candidate.sku,
      priceMinor: candidate.priceMinor,
      availability: listing.availability,
      images: Array.isArray(candidate.imageUrls) ? candidate.imageUrls.length : 0,
      errors: row.errors,
    };
  });
  console.log(
    JSON.stringify(
      {
        jobId: job.id,
        status: job.status,
        totalRows: job.totalRows,
        validRows: job.validRows,
        importedRows: job.importedRows,
        failedRows: job.failedRows,
        lastError: job.lastError,
        rows,
      },
      null,
      2,
    ),
  );
}
