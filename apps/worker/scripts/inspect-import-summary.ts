import { PrismaClient } from '@atlas/database';

const jobId = process.argv[2];
if (!jobId) throw new Error('Usage: inspect-import-summary.ts <job-id>');

const db = new PrismaClient();
try {
  const job = await db.importJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { id: true, organizationId: true, status: true, totalRows: true },
  });
  const [rows, products, listings, snapshots, evidence, media] = await Promise.all([
    db.importRow.groupBy({
      by: ['status'],
      where: { importJobId: job.id },
      _count: { _all: true },
    }),
    db.product.count({ where: { organizationId: job.organizationId } }),
    db.externalListing.count({ where: { organizationId: job.organizationId } }),
    db.listingSnapshot.count({ where: { organizationId: job.organizationId } }),
    db.productFieldEvidence.count({ where: { organizationId: job.organizationId } }),
    db.productMedia.count({ where: { organizationId: job.organizationId } }),
  ]);
  console.log(
    JSON.stringify(
      { job, rows, totals: { products, listings, snapshots, evidence, media } },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
