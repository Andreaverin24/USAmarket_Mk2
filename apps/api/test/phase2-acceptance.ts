import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@atlas/database';
import { loadConfig } from '@atlas/config';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';
import { PostgresSearchProvider } from '../src/modules/catalog/search.provider.js';
import { ImportService } from '../src/modules/imports/import.service.js';
import { MediaService } from '../src/modules/media/media.service.js';
import { StorefrontService } from '../src/modules/storefronts/storefront.service.js';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import { startOutboxWorker } from '../../worker/src/outbox-worker.js';

const db = new PrismaClient();
const evidence: Record<string, unknown> = { startedAt: new Date().toISOString() };

async function main() {
  const config = loadConfig();
  const organization = await db.organization.findUniqueOrThrow({
    where: { slug: 'established-lines' },
  });
  const seller = await db.user.findUniqueOrThrow({ where: { email: 'seller@atlas.local' } });
  const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@atlas.local' } });
  const tenants = new TenantService(db as never);
  const imports = new ImportService(db as never, tenants);
  const media = new MediaService(db as never, tenants);
  const catalog = new CatalogService(
    db as never,
    tenants,
    new AuditService(),
    new PostgresSearchProvider(db as never),
  );
  const storefronts = new StorefrontService(db as never);
  const csv = await readFile(resolve(import.meta.dirname, 'fixtures/shopify-products.csv'), 'utf8');
  const run = Date.now();

  const beforeDryRun = await db.product.count({ where: { organizationId: organization.id } });
  const preview = await imports.shopify(seller.id, organization.id, {
    csv,
    dryRun: true,
    idempotencyKey: `acceptance-preview-${run}`,
    correlationId: randomUUID(),
  });
  const afterDryRun = await db.product.count({ where: { organizationId: organization.id } });
  assert(preview.totalRows === 10 && preview.validRows === 10, 'Preview must validate 10 rows');
  assert(beforeDryRun === afterDryRun, 'Dry run must not mutate products');
  evidence.preview = {
    jobId: preview.id,
    totalRows: preview.totalRows,
    validRows: preview.validRows,
  };

  const stopWorker = startOutboxWorker(config);
  try {
    const queued = await imports.shopify(seller.id, organization.id, {
      csv,
      dryRun: false,
      idempotencyKey: `acceptance-apply-${run}`,
      correlationId: randomUUID(),
    });
    const imported = await waitForImport(queued.id);
    assert(
      imported.status === 'COMPLETED' && imported.importedRows === 10,
      'Background import must complete 10 rows',
    );
    assert(
      (await db.product.count({
        where: { organizationId: organization.id, externalSource: 'shopify' },
      })) === 10,
      'Canonical Shopify product count must be 10',
    );
    evidence.import = {
      jobId: imported.id,
      status: imported.status,
      importedRows: imported.importedRows,
    };

    const reimport = await imports.shopify(seller.id, organization.id, {
      csv,
      dryRun: false,
      idempotencyKey: `acceptance-reimport-${run}`,
      correlationId: randomUUID(),
    });
    await waitForImport(reimport.id);
    assert(
      (await db.product.count({
        where: { organizationId: organization.id, externalSource: 'shopify' },
      })) === 10,
      'Re-import must not create duplicate products',
    );

    const product = await db.product.findFirstOrThrow({
      where: {
        organizationId: organization.id,
        externalSource: 'shopify',
        status: { in: ['DRAFT', 'NEEDS_CHANGES'] },
      },
      orderBy: { inventorySku: 'asc' },
    });
    const original = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const checksum = createHash('sha256').update(original).digest('hex');
    const mediaIds: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const signed = await media.uploadUrl(seller.id, organization.id, product.id, {
        filename: `acceptance-${index}.png`,
        mimeType: 'image/png',
        size: original.byteLength,
        checksum,
      });
      const upload = await fetch(signed.uploadUrl, {
        method: 'PUT',
        body: original,
        headers: { 'content-type': 'image/png' },
      });
      if (!upload.ok) {
        throw new Error(
          `Signed media upload ${index} failed with ${upload.status}: ${await upload.text()}`,
        );
      }
      await media.complete(seller.id, organization.id, product.id, signed.mediaId);
      mediaIds.push(signed.mediaId);
    }
    await waitForMedia(mediaIds);
    const variants = await db.mediaVariant.count({ where: { mediaId: { in: mediaIds } } });
    assert(variants === 12, 'Four originals must generate 12 normalized variants');
    evidence.media = { mediaIds, variants };

    const submitted = await catalog.submit(seller.id, organization.id, product.id, randomUUID());
    const approved = await catalog.moderate(
      admin.id,
      organization.id,
      product.id,
      'approve',
      undefined,
      randomUUID(),
    );
    const published = await catalog.moderate(
      admin.id,
      organization.id,
      product.id,
      'publish',
      undefined,
      randomUUID(),
    );
    assert(
      submitted.status === 'SUBMITTED' &&
        approved.status === 'APPROVED' &&
        published.status === 'PUBLISHED',
      'Moderation state machine must publish',
    );
    const marketplaceBefore = await catalog.publicProduct(published.slug);
    const storefrontBefore = await storefronts.product('established-lines', published.slug);
    assert(
      marketplaceBefore.id === storefrontBefore.id,
      'Public channels must share canonical product ID',
    );

    const title = `Acceptance canonical edit ${run}`;
    const updated = await catalog.update(
      seller.id,
      organization.id,
      product.id,
      { title, version: published.version },
      randomUUID(),
    );
    assert(
      (await catalog.publicProduct(updated.slug)).title === title,
      'Marketplace must reflect seller edit',
    );
    assert(
      (await storefronts.product('established-lines', updated.slug)).title === title,
      'Storefront must reflect seller edit',
    );
    assert(
      (await catalog.publicProducts({ q: 'Acceptance canonical edt' })).items.some(
        (item) => item.id === product.id,
      ),
      'Search must find typo through FTS/trigram provider',
    );
    const redirect = await storefronts.redirect(
      'established-lines',
      '/products/italian-travertine-console',
    );
    evidence.canonicalProduct = {
      id: product.id,
      slug: updated.slug,
      title,
      redirect: redirect.targetPath,
    };
    evidence.reimport = { jobId: reimport.id, canonicalProducts: 10 };
  } finally {
    await stopWorker();
  }

  evidence.completedAt = new Date().toISOString();
  evidence.status = 'passed';
  const directory = resolve(import.meta.dirname, '../../../artifacts/phase-2');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

async function waitForImport(jobId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
    if (['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(job.status)) return job;
    await delay(250);
  }
  throw new Error(`Import ${jobId} timed out`);
}

async function waitForMedia(mediaIds: string[]) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const media = await db.productMedia.findMany({ where: { id: { in: mediaIds } } });
    if (media.every((item) => item.processingStatus === 'READY')) return;
    const failed = media.find((item) => item.processingStatus === 'FAILED');
    if (failed) throw new Error(`Media failed: ${failed.processingError}`);
    await delay(250);
  }
  throw new Error('Media processing timed out');
}

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const delay = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

main()
  .catch(async (error) => {
    evidence.status = 'failed';
    evidence.error = error instanceof Error ? error.message : String(error);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
