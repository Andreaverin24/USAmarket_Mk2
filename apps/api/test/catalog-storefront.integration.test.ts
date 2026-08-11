import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@atlas/database';
import { hashPassword } from '@atlas/auth';
import { processImportJob } from '@atlas/catalog';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';
import { PostgresSearchProvider } from '../src/modules/catalog/search.provider.js';
import { ImportService } from '../src/modules/imports/import.service.js';
import { MediaService } from '../src/modules/media/media.service.js';
import { StorefrontService } from '../src/modules/storefronts/storefront.service.js';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import {
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database.js';

describe('Phase 2 catalog vertical slice', () => {
  let database: IntegrationDatabase;
  let db: PrismaClient;
  let catalog: CatalogService;
  let imports: ImportService;
  let storefronts: StorefrontService;
  let media: MediaService;
  let sellerId: string;
  let adminId: string;
  let otherId: string;
  let sellerOrgId: string;
  let otherOrgId: string;
  let csv: string;
  beforeAll(async () => {
    database = await setupIntegrationDatabase();
    db = new PrismaClient({ datasources: { db: { url: database.url } } });
    const permissions = await Promise.all(
      ['catalog:read', 'catalog:write', 'catalog:submit', 'catalog:moderate', 'platform:admin'].map(
        (code) => db.permission.create({ data: { code, description: code } }),
      ),
    );
    const [sellerOrg, otherOrg, platformOrg] = await Promise.all([
      db.organization.create({
        data: { slug: 'established-lines', name: 'Established Lines', type: 'SELLER' },
      }),
      db.organization.create({
        data: { slug: 'other-seller', name: 'Other Seller', type: 'SELLER' },
      }),
      db.organization.create({ data: { slug: 'platform', name: 'Platform', type: 'PLATFORM' } }),
    ]);
    sellerOrgId = sellerOrg.id;
    otherOrgId = otherOrg.id;
    await Promise.all([
      db.dealerProfile.create({
        data: {
          organizationId: sellerOrg.id,
          status: 'APPROVED',
          publicDealerName: sellerOrg.name,
          approvedAt: new Date(),
        },
      }),
      db.dealerProfile.create({
        data: {
          organizationId: otherOrg.id,
          status: 'APPROVED',
          publicDealerName: otherOrg.name,
          approvedAt: new Date(),
        },
      }),
    ]);
    const [sellerRole, otherRole, adminRole] = await Promise.all([
      db.role.create({
        data: {
          code: 'seller-owner',
          name: 'Seller Owner',
          organizationId: sellerOrg.id,
          permissions: {
            create: permissions
              .filter((p) => ['catalog:read', 'catalog:write', 'catalog:submit'].includes(p.code))
              .map((p) => ({ permissionId: p.id })),
          },
        },
      }),
      db.role.create({
        data: {
          code: 'other-owner',
          name: 'Other Owner',
          organizationId: otherOrg.id,
          permissions: {
            create: permissions
              .filter((p) => ['catalog:read', 'catalog:write', 'catalog:submit'].includes(p.code))
              .map((p) => ({ permissionId: p.id })),
          },
        },
      }),
      db.role.create({
        data: {
          code: 'platform-admin',
          name: 'Admin',
          organizationId: platformOrg.id,
          permissions: {
            create: permissions
              .filter((p) => p.code === 'platform:admin')
              .map((p) => ({ permissionId: p.id })),
          },
        },
      }),
    ]);
    const passwordHash = await hashPassword('integration-password');
    const [seller, other, admin] = await Promise.all([
      db.user.create({
        data: { email: 'seller@integration.local', displayName: 'Seller', passwordHash },
      }),
      db.user.create({
        data: { email: 'other@integration.local', displayName: 'Other', passwordHash },
      }),
      db.user.create({
        data: { email: 'admin@integration.local', displayName: 'Admin', passwordHash },
      }),
    ]);
    sellerId = seller.id;
    otherId = other.id;
    adminId = admin.id;
    await Promise.all([
      db.organizationMember.create({
        data: { organizationId: sellerOrg.id, userId: seller.id, roleId: sellerRole.id },
      }),
      db.organizationMember.create({
        data: { organizationId: otherOrg.id, userId: other.id, roleId: otherRole.id },
      }),
      db.organizationMember.create({
        data: { organizationId: platformOrg.id, userId: admin.id, roleId: adminRole.id },
      }),
      db.location.create({
        data: {
          organizationId: sellerOrg.id,
          name: 'Gallery',
          city: 'New York',
          region: 'NY',
          postalCode: '10013',
        },
      }),
    ]);
    const storefront = await db.storefront.create({
      data: { organizationId: sellerOrg.id, slug: 'established-lines', status: 'ACTIVE' },
    });
    await db.storefrontTheme.create({
      data: {
        organizationId: sellerOrg.id,
        storefrontId: storefront.id,
        preset: 'established-lines',
        heroTitle: 'Objects with a past.',
      },
    });
    const otherStorefront = await db.storefront.create({
      data: { organizationId: otherOrg.id, slug: 'other-seller', status: 'ACTIVE' },
    });
    await db.storefrontTheme.create({
      data: {
        organizationId: otherOrg.id,
        storefrontId: otherStorefront.id,
        preset: 'atlas',
      },
    });
    await db.storefrontDomain.create({
      data: {
        organizationId: sellerOrg.id,
        storefrontId: storefront.id,
        hostname: 'shop.established-lines.test',
        isPrimary: true,
        verifiedAt: new Date(),
      },
    });
    await db.redirectMapping.create({
      data: {
        organizationId: sellerOrg.id,
        storefrontId: storefront.id,
        sourcePath: '/products/italian-travertine-console',
        targetPath: '/dealers/established-lines/products/italian-travertine-console',
      },
    });
    const tenants = new TenantService(db as any);
    imports = new ImportService(db as any, tenants);
    catalog = new CatalogService(
      db as any,
      tenants,
      new AuditService(),
      new PostgresSearchProvider(db as any),
    );
    storefronts = new StorefrontService(db as any);
    media = new MediaService(db as any, tenants);
    csv = readFileSync(resolve(import.meta.dirname, 'fixtures/shopify-products.csv'), 'utf8');
  });
  afterAll(async () => {
    await teardownIntegrationDatabase(database, db);
  });

  it('dry-runs and idempotently imports exactly 10 products', async () => {
    const dry = await imports.shopify(sellerId, sellerOrgId, {
      csv,
      dryRun: true,
      idempotencyKey: 'dry-run-001',
    });
    expect(dry.totalRows).toBe(10);
    expect(await db.product.count()).toBe(0);
    const queued = await imports.shopify(sellerId, sellerOrgId, {
      csv,
      dryRun: false,
      idempotencyKey: 'apply-001',
    });
    expect(queued.status).toBe('PENDING');
    expect(await db.product.count()).toBe(0);
    const applied = await processImportJob(db, queued.id, 'integration-worker-1');
    expect(applied.importedRows).toBe(10);
    expect(await db.product.count()).toBe(10);
    expect(await db.inventoryItem.count()).toBe(10);
    await expect(
      imports.shopify(sellerId, sellerOrgId, {
        csv: csv.replace('Italian Travertine Console', 'Changed checksum'),
        dryRun: false,
        idempotencyKey: 'apply-001',
      }),
    ).rejects.toMatchObject({ status: 409 });
    const reimport = await imports.shopify(sellerId, sellerOrgId, {
      csv,
      dryRun: false,
      idempotencyKey: 'apply-002',
    });
    await processImportJob(db, reimport.id, 'integration-worker-2');
    expect(await db.product.count()).toBe(10);
  });

  it('publishes one source to marketplace and storefront and reflects seller edits', async () => {
    const product = await db.product.findFirstOrThrow({
      where: { organizationId: sellerOrgId },
      include: { category: true },
    });
    const correlationId = crypto.randomUUID();
    await catalog.submit(sellerId, sellerOrgId, product.id, correlationId);
    await catalog.moderate(adminId, sellerOrgId, product.id, 'approve', undefined, correlationId);
    await db.productMedia.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        organizationId: sellerOrgId,
        productId: product.id,
        sourceUrl: `https://images.example.test/${index}.jpg`,
        processingStatus: 'READY',
        mimeType: 'image/jpeg',
        checksum: String(index).padStart(64, '0'),
        isPrimary: index === 0,
        sortOrder: index,
      })),
    });
    const published = await catalog.moderate(
      adminId,
      sellerOrgId,
      product.id,
      'publish',
      undefined,
      correlationId,
    );
    const marketplace = await catalog.publicProduct(published.slug);
    const storefront = await storefronts.product('established-lines', published.slug);
    expect(storefront.id).toBe(marketplace.id);
    expect((await storefronts.home('other-seller')).products).toEqual([]);
    await expect(storefronts.product('other-seller', published.slug)).rejects.toMatchObject({
      status: 404,
    });
    const updated = await catalog.update(
      sellerId,
      sellerOrgId,
      product.id,
      { title: 'Updated from Seller Portal', version: published.version },
      correlationId,
    );
    expect((await catalog.publicProduct(updated.slug)).title).toBe('Updated from Seller Portal');
    expect((await storefronts.product('established-lines', updated.slug)).title).toBe(
      'Updated from Seller Portal',
    );
    const resolvedByDomain = await storefronts.resolve('SHOP.ESTABLISHED-LINES.TEST:443');
    const resolvedByFallback = await storefronts.resolve('established-lines.atlas.localhost:3000');
    expect(resolvedByDomain.id).toBe(resolvedByFallback.id);
    await expect(storefronts.resolve('unknown.example.test')).rejects.toMatchObject({
      status: 404,
    });
    expect(
      (await storefronts.redirect('established-lines', '/products/italian-travertine-console'))
        .statusCode,
    ).toBe(301);

    const filtered = await catalog.publicProducts({
      q: 'Updated Seller Portal',
      category: product.category.slug,
      seller: 'established-lines',
      condition: product.condition,
      minPrice: '1',
      maxPrice: product.priceMinor.toString(),
    });
    expect(filtered.items.map((entry) => entry.id)).toContain(product.id);
    expect(
      (await catalog.publicProducts({ q: 'Updatd Seller Portal' })).items.map((entry) => entry.id),
    ).toContain(product.id);
    const sitemap = await catalog.sitemap();
    expect(sitemap.products.map((entry) => entry.slug)).toContain(updated.slug);
    expect(await db.auditLog.count({ where: { resourceId: product.id } })).toBeGreaterThanOrEqual(
      5,
    );
  });

  it('fails closed for another seller', async () => {
    const product = await db.product.findFirstOrThrow({ where: { organizationId: sellerOrgId } });
    await expect(catalog.sellerProduct(otherId, otherOrgId, product.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      catalog.update(
        otherId,
        otherOrgId,
        product.id,
        { title: 'IDOR mutation', version: product.version },
        crypto.randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      media.uploadUrl(otherId, otherOrgId, product.id, {
        filename: 'foreign.jpg',
        mimeType: 'image/jpeg',
        size: 128,
        checksum: 'a'.repeat(64),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('recovers only a failed import row without duplicating successful rows', async () => {
    const job = await imports.shopify(sellerId, sellerOrgId, {
      csv,
      dryRun: false,
      idempotencyKey: 'recovery-001',
    });
    const row = await db.importRow.findFirstOrThrow({
      where: { importJobId: job.id, status: 'VALID' },
    });
    const validPayload = row.normalizedPayload;
    await db.importRow.update({
      where: { id: row.id },
      data: { normalizedPayload: { ...(validPayload as object), priceMinor: 'invalid' } },
    });
    const partial = await processImportJob(db, job.id, 'integration-recovery-1');
    expect(partial.status).toBe('COMPLETED_WITH_ERRORS');
    await db.importRow.update({
      where: { id: row.id },
      data: { normalizedPayload: validPayload! },
    });
    await imports.retry(sellerId, sellerOrgId, job.id);
    const recovered = await processImportJob(db, job.id, 'integration-recovery-2');
    expect(recovered.status).toBe('COMPLETED');
    expect(await db.product.count({ where: { organizationId: sellerOrgId } })).toBe(10);
  });
});
