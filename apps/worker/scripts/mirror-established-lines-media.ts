import { PrismaClient } from '@atlas/database';
import { loadConfig } from '@atlas/config';
import { importMedia } from '../src/outbox-worker.js';

const numericArgument = (name: string, fallback: number) => {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  return argument ? Number(argument.split('=')[1]) : fallback;
};
const limit = numericArgument('limit', Number.POSITIVE_INFINITY);
const concurrency = numericArgument('concurrency', 1);
if (limit !== Number.POSITIVE_INFINITY && (!Number.isInteger(limit) || limit < 1))
  throw new Error('Limit must be a positive integer');
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
  throw new Error('Concurrency must be an integer between 1 and 8');

const db = new PrismaClient();
const config = loadConfig();

try {
  const organization = await db.organization.findUniqueOrThrow({
    where: { slug: 'established-lines' },
    select: { id: true, name: true },
  });
  const media = await db.productMedia.findMany({
    where: { organizationId: organization.id, sourceUrl: { not: null } },
    orderBy: [{ product: { createdAt: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      productId: true,
      sourceUrl: true,
      storageKey: true,
      checksum: true,
      processingStatus: true,
    },
  });
  const candidates = media
    .filter((entry) => entry.processingStatus !== 'READY' || !entry.storageKey || !entry.checksum)
    .slice(0, limit);
  const failures: Array<{ mediaId: string; error: string }> = [];
  let completed = 0;

  console.log(
    JSON.stringify({
      organization: organization.name,
      discovered: media.length,
      selected: candidates.length,
    }),
  );
  let cursor = 0;
  const mirrorNext = async () => {
    while (cursor < candidates.length) {
      const entry = candidates[cursor++];
      if (!entry) return;
      try {
        await importMedia(db, config, entry.id);
        await db.outboxEvent.updateMany({
          where: {
            aggregateId: entry.id,
            eventType: 'catalog.media.import-requested',
            processedAt: null,
          },
          data: { processedAt: new Date(), lockedAt: null, lastError: null },
        });
        completed += 1;
        console.log(`READY ${completed}/${candidates.length} ${entry.id}`);
      } catch (cause) {
        const error = cause instanceof Error ? cause.message : 'Unknown media mirror error';
        failures.push({ mediaId: entry.id, error });
        console.error(`FAILED ${entry.id} ${error}`);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(candidates.length, 1)) }, mirrorNext),
  );

  const [statuses, originals, variants] = await Promise.all([
    db.productMedia.groupBy({
      by: ['processingStatus'],
      where: { organizationId: organization.id },
      _count: { _all: true },
    }),
    db.productMedia.aggregate({
      where: { organizationId: organization.id, storageKey: { not: null } },
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
    db.mediaVariant.aggregate({
      where: { organizationId: organization.id },
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
  ]);
  console.log(
    JSON.stringify(
      {
        completed,
        failures,
        statuses,
        originals,
        variants,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
