import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@atlas/database';
import { hashPassword } from '@atlas/auth';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';
import { productInputSchema } from '../src/modules/catalog/catalog.schemas.js';
import { PostgresSearchProvider } from '../src/modules/catalog/search.provider.js';
import { DealerService } from '../src/modules/dealers/dealer.service.js';
import { StorefrontService } from '../src/modules/storefronts/storefront.service.js';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import {
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database.js';

describe('Phase 3 dealer onboarding and moderation', () => {
  let database: IntegrationDatabase;
  let db: PrismaClient;
  let dealers: DealerService;
  let catalog: CatalogService;
  let storefronts: StorefrontService;
  let applicantId: string;
  let otherId: string;
  let adminId: string;
  let categoryId: string;

  beforeAll(async () => {
    database = await setupIntegrationDatabase();
    db = new PrismaClient({ datasources: { db: { url: database.url } } });
    const permissionCodes = [
      'platform:admin',
      'organization:members:read',
      'organization:settings:write',
      'dealer:application:read',
      'dealer:application:write',
      'dealer:review',
      'catalog:read',
      'catalog:write',
      'catalog:submit',
      'catalog:moderate',
      'storefront:write',
      'notifications:read',
    ];
    await db.permission.createMany({
      data: permissionCodes.map((code) => ({ code, description: code })),
    });
    const platform = await db.organization.create({
      data: { slug: 'platform', name: 'THE GUILD', type: 'PLATFORM' },
    });
    const permissions = await db.permission.findMany();
    const adminRole = await db.role.create({
      data: {
        code: 'PLATFORM_ADMIN',
        name: 'PLATFORM_ADMIN',
        organizationId: platform.id,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
    });
    const passwordHash = await hashPassword('phase-three-password');
    const [applicant, other, admin] = await Promise.all([
      db.user.create({
        data: { email: 'candidate@example.test', displayName: 'Candidate', passwordHash },
      }),
      db.user.create({
        data: { email: 'other@example.test', displayName: 'Other', passwordHash },
      }),
      db.user.create({
        data: { email: 'admin@example.test', displayName: 'Admin', passwordHash },
      }),
    ]);
    applicantId = applicant.id;
    otherId = other.id;
    adminId = admin.id;
    await db.organizationMember.create({
      data: { organizationId: platform.id, userId: admin.id, roleId: adminRole.id },
    });
    categoryId = (await db.category.create({ data: { slug: 'furniture', name: 'Furniture' } })).id;
    const tenants = new TenantService(db as never);
    const audit = new AuditService();
    dealers = new DealerService(db as never, tenants, audit);
    catalog = new CatalogService(
      db as never,
      tenants,
      audit,
      new PostgresSearchProvider(db as never),
    );
    storefronts = new StorefrontService(db as never);
  }, 120_000);

  afterAll(async () => {
    await teardownIntegrationDatabase(database, db);
  });

  it('completes dealer approval and historical product moderation without losing canonical ID', async () => {
    let application = await dealers.create(
      applicantId,
      dealerInput('guild-candidate', 'Guild Candidate'),
      crypto.randomUUID(),
    );
    const organizationId = application.organizationId;
    application = await dealers.submit(
      applicantId,
      organizationId,
      application.version,
      crypto.randomUUID(),
    );
    expect(application.status).toBe('SUBMITTED');

    const product = await catalog.create(
      applicantId,
      organizationId,
      productInputSchema.parse({
        title: 'Documented Walnut Lounge Chair',
        slug: 'documented-walnut-lounge-chair',
        productType: 'Lounge Chair',
        categoryId,
        condition: 'EXCELLENT',
        quantity: 1,
        quantityAvailable: 1,
        priceMinor: '485000',
        inventorySku: 'GUILD-PH3-001',
      }),
      crypto.randomUUID(),
    );
    await expect(
      catalog.submit(applicantId, organizationId, product.id, crypto.randomUUID()),
    ).rejects.toMatchObject({ status: 409 });

    application = await dealers.review(
      adminId,
      application.id,
      {
        action: 'start_review',
        version: application.version,
      },
      crypto.randomUUID(),
    );
    application = await dealers.review(
      adminId,
      application.id,
      {
        action: 'approve',
        version: application.version,
      },
      crypto.randomUUID(),
    );
    expect(application.status).toBe('APPROVED');
    expect(await db.dealerVerification.count({ where: { applicationId: application.id } })).toBe(2);

    await db.productMedia.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        organizationId,
        productId: product.id,
        sourceUrl: `https://images.example.test/${index}.jpg`,
        processingStatus: 'READY' as const,
        moderationStatus: 'APPROVED' as const,
      })),
    });
    let moderated = await catalog.submit(
      applicantId,
      organizationId,
      product.id,
      crypto.randomUUID(),
    );
    expect(moderated.status).toBe('SUBMITTED');
    await expect(
      catalog.moderate(
        applicantId,
        organizationId,
        product.id,
        'approve',
        undefined,
        crypto.randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 404 });

    moderated = await catalog.moderate(
      adminId,
      organizationId,
      product.id,
      'reject',
      'Add a detailed restoration statement.',
      crypto.randomUUID(),
    );
    expect(moderated.status).toBe('NEEDS_CHANGES');
    moderated = await catalog.update(
      applicantId,
      organizationId,
      product.id,
      {
        version: moderated.version,
        restorationNotes: 'Original joinery retained; upholstery professionally renewed in 2024.',
      },
      crypto.randomUUID(),
    );
    moderated = await catalog.submit(applicantId, organizationId, product.id, crypto.randomUUID());
    moderated = await catalog.moderate(
      adminId,
      organizationId,
      product.id,
      'approve',
      undefined,
      crypto.randomUUID(),
    );
    moderated = await catalog.moderate(
      adminId,
      organizationId,
      product.id,
      'publish',
      undefined,
      crypto.randomUUID(),
    );
    expect(moderated.status).toBe('PUBLISHED');

    const reviews = await catalog.moderationHistory(applicantId, organizationId, product.id);
    expect(reviews).toHaveLength(2);
    expect(reviews[0]?.status).toBe('CHANGES_REQUESTED');
    expect(reviews[0]?.comments[0]?.body).toContain('restoration');
    expect(reviews[1]?.status).toBe('PUBLISHED');
    const marketplace = await catalog.publicProduct(product.slug);
    const storefront = await storefronts.product('guild-candidate', product.slug);
    expect(marketplace.id).toBe(product.id);
    expect(storefront.id).toBe(product.id);
    expect(await db.auditLog.count({ where: { organizationId } })).toBeGreaterThanOrEqual(10);
    expect(
      await db.outboxEvent.count({
        where: {
          organizationId,
          eventType: {
            in: [
              'dealer.application.submitted',
              'catalog.product.submitted',
              'catalog.product.publish',
            ],
          },
        },
      }),
    ).toBeGreaterThanOrEqual(3);

    const otherApplication = await dealers.create(
      otherId,
      dealerInput('other-candidate', 'Other Candidate'),
      crypto.randomUUID(),
    );
    await expect(
      catalog.sellerProduct(otherId, otherApplication.organizationId, product.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(dealers.owned(otherId, organizationId)).rejects.toMatchObject({ status: 404 });
  });
});

function dealerInput(organizationSlug: string, organizationName: string) {
  return {
    organizationSlug,
    organizationName,
    legalBusinessName: `${organizationName} LLC`,
    publicDealerName: organizationName,
    businessType: 'LLC',
    website: `https://${organizationSlug}.example.test`,
    email: `${organizationSlug}@example.test`,
    phone: '+1 212 555 0100',
    businessAddress: {
      line1: '100 Design Avenue',
      city: 'New York',
      region: 'NY',
      postalCode: '10013',
      countryCode: 'US' as const,
    },
    contactPerson: 'Dealer Owner',
    companyDescription:
      'Independent American dealer specializing in documented vintage furniture and collectible design.',
    specialties: ['Vintage furniture', 'Decorative arts'],
    yearsInBusiness: 8,
    supportingDocuments: [],
  };
}
