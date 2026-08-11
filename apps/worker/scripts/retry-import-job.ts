import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@atlas/database';
import { processImportJob } from '@atlas/catalog';

const jobId = process.argv[2];
if (!jobId) throw new Error('Usage: retry-import-job.ts <job-id>');

const db = new PrismaClient();
try {
  const result = await processImportJob(db, jobId, `manual-retry-${randomUUID()}`);
  console.log(
    JSON.stringify(
      {
        jobId: result.id,
        status: result.status,
        totalRows: result.totalRows,
        validRows: result.validRows,
        importedRows: result.importedRows,
        failedRows: result.failedRows,
        lastError: result.lastError,
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
