import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@atlas/database';
import { processImportJob } from '@atlas/catalog';
import { loadEstablishedLinesLocalFixture } from '../src/established-lines-local-fixture.js';

const db = new PrismaClient();
const legacySampleSkus = ['EL-CONSOLE-001', 'EL-CHAIR-001', 'EL-SCONCE-001'];

try {
  const fixture = await loadEstablishedLinesLocalFixture();
  if (process.argv.includes('--verify-only')) {
    console.log(
      JSON.stringify(
        {
          fixturePath: fixture.fixturePath,
          checksum: fixture.checksum,
          validRows: fixture.rows.length,
        },
        null,
        2,
      ),
    );
  } else {
    const [organization, seller, moderator] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { slug: 'established-lines' },
        select: { id: true, slug: true, name: true },
      }),
      db.user.findUniqueOrThrow({ where: { email: 'seller@atlas.local' }, select: { id: true } }),
      db.user.findUniqueOrThrow({ where: { email: 'admin@atlas.local' }, select: { id: true } }),
    ]);
    const idempotencyKey = `established-lines-local-${fixture.checksum.slice(0, 24)}`;
    let job = await db.importJob.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: organization.id, idempotencyKey } },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });

    if (!job) {
      const confirmedAt = new Date();
      job = await db.importJob.create({
        data: {
          organizationId: organization.id,
          idempotencyKey,
          source: 'web',
          checksum: fixture.checksum,
          dryRun: false,
          status: 'PENDING',
          totalRows: fixture.rows.length,
          validRows: fixture.rows.length,
          mapping: {
            importMode: 'local-fixture',
            fixturePath: fixture.fixturePath,
            fixtureChecksum: fixture.checksum,
            sourceSite: 'https://www.establishedlines.com/',
            rightsConfirmed: true,
            rightsConfirmationScope: 'Owner-authorized local Established Lines catalog fixture',
          } as Prisma.InputJsonValue,
          requestedByUserId: seller.id,
          rightsConfirmedByUserId: seller.id,
          rightsConfirmedAt: confirmedAt,
          rightsScopeHash: fixture.checksum,
          correlationId: randomUUID(),
          rows: {
            create: fixture.rows.map((row) => ({
              rowNumber: row.rowNumber,
              externalId: row.normalizedPayload.externalId ?? null,
              sku: row.normalizedPayload.sku,
              status: 'VALID',
              payload: row.payload as Prisma.InputJsonValue,
              normalizedPayload: row.normalizedPayload as unknown as Prisma.InputJsonValue,
            })),
          },
        },
        include: { rows: { orderBy: { rowNumber: 'asc' } } },
      });
    } else if (job.checksum !== fixture.checksum) {
      throw new Error('Established Lines local import idempotency checksum conflict');
    }

    if (!job) throw new Error('Established Lines local import job was not created');
    if (job.status !== 'COMPLETED')
      await processImportJob(db, job.id, `local-fixture-${randomUUID()}`);
    const completedJob = await db.importJob.findUniqueOrThrow({
      where: { id: job.id },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (completedJob.status !== 'COMPLETED' || completedJob.importedRows !== fixture.rows.length)
      throw new Error(
        `Established Lines local import failed: ${completedJob.status} (${completedJob.failedRows} failed rows)`,
      );

    const productIds = completedJob.rows.flatMap((row) => (row.productId ? [row.productId] : []));
    if (productIds.length !== fixture.rows.length)
      throw new Error('Established Lines import did not assign every fixture row to a product');

    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, organizationId: organization.id },
        select: { id: true, version: true, status: true, colors: true },
      });
      if (products.length !== fixture.rows.length)
        throw new Error('Established Lines catalog contains fewer products than the fixture');

      let published = 0;
      let coloursReconciled = 0;
      const coloursByProductId = new Map(
        completedJob.rows.flatMap((row) => {
          const fixtureRow = fixture.rows[row.rowNumber - 1];
          return row.productId && fixtureRow
            ? [[row.productId, fixtureRow.normalizedPayload.colors] as const]
            : [];
        }),
      );
      for (const product of products) {
        const expectedColours = coloursByProductId.get(product.id);
        if (!expectedColours) throw new Error('Established Lines fixture row is missing colours');
        let currentVersion = product.version;
        if (!sameValues(product.colors, expectedColours)) {
          await tx.product.update({
            where: { id: product.id },
            data: { colors: expectedColours, version: { increment: 1 } },
          });
          currentVersion += 1;
          coloursReconciled += 1;
          await tx.auditLog.create({
            data: {
              organizationId: organization.id,
              actorUserId: seller.id,
              action: 'catalog.product.colours.reconciled',
              resourceType: 'Product',
              resourceId: product.id,
              correlationId: completedJob.correlationId ?? randomUUID(),
              metadata: { importJobId: completedJob.id, colours: expectedColours },
            },
          });
        }
        if (product.status === 'PUBLISHED') continue;
        const publishedVersion = currentVersion + 1;
        await tx.product.update({
          where: { id: product.id },
          data: {
            status: 'PUBLISHED',
            submittedAt: now,
            approvedAt: now,
            publishedAt: now,
            version: { increment: 1 },
          },
        });
        await tx.productModerationReview.upsert({
          where: {
            productId_submittedVersion: {
              productId: product.id,
              submittedVersion: publishedVersion,
            },
          },
          update: { status: 'PUBLISHED', moderatorUserId: moderator.id, reviewedAt: now },
          create: {
            organizationId: organization.id,
            productId: product.id,
            submittedVersion: publishedVersion,
            status: 'PUBLISHED',
            moderatorUserId: moderator.id,
            submittedAt: now,
            reviewedAt: now,
          },
        });
        published += 1;
      }
      const archivedLegacySamples = await tx.product.updateMany({
        where: { organizationId: organization.id, inventorySku: { in: legacySampleSkus } },
        data: { status: 'ARCHIVED', publishedAt: null, version: { increment: 1 } },
      });
      return { published, coloursReconciled, archivedLegacySamples: archivedLegacySamples.count };
    });

    const [publishedProducts, externalListings, sourceMedia] = await Promise.all([
      db.product.count({ where: { organizationId: organization.id, status: 'PUBLISHED' } }),
      db.externalListing.count({ where: { organizationId: organization.id } }),
      db.productMedia.count({ where: { organizationId: organization.id } }),
    ]);
    console.log(
      JSON.stringify(
        {
          seller: organization,
          job: {
            id: completedJob.id,
            status: completedJob.status,
            importedRows: completedJob.importedRows,
          },
          publishedThisRun: result.published,
          coloursReconciled: result.coloursReconciled,
          archivedLegacySamples: result.archivedLegacySamples,
          totals: { publishedProducts, externalListings, sourceMedia },
        },
        null,
        2,
      ),
    );
  }
} finally {
  await db.$disconnect();
}

function sameValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
