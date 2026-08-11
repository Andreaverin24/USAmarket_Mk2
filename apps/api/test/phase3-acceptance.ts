import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@atlas/database';
import { loadConfig } from '@atlas/config';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';
import { productInputSchema } from '../src/modules/catalog/catalog.schemas.js';
import { PostgresSearchProvider } from '../src/modules/catalog/search.provider.js';
import { DealerService } from '../src/modules/dealers/dealer.service.js';
import { StorefrontService } from '../src/modules/storefronts/storefront.service.js';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import { startOutboxWorker } from '../../worker/src/outbox-worker.js';

const db = new PrismaClient();
const evidence: Record<string, unknown> = { startedAt: new Date().toISOString() };

async function main() {
  const config = loadConfig();
  const [applicant, admin, other, category] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { email: 'applicant@atlas.local' } }),
    db.user.findUniqueOrThrow({ where: { email: 'admin@atlas.local' } }),
    db.user.findUniqueOrThrow({ where: { email: 'other-seller@atlas.local' } }),
    db.category.findUniqueOrThrow({ where: { slug: 'furniture' } }),
  ]);
  const tenants = new TenantService(db as never);
  const audit = new AuditService();
  const dealers = new DealerService(db as never, tenants, audit);
  const catalog = new CatalogService(
    db as never,
    tenants,
    audit,
    new PostgresSearchProvider(db as never),
  );
  const storefronts = new StorefrontService(db as never);
  const run = Date.now();
  const slug = `phase-three-dealer-${run}`;
  const stopWorker = startOutboxWorker(config);
  try {
    let application = await dealers.create(
      applicant.id,
      {
        organizationSlug: slug,
        organizationName: 'Phase Three Dealer',
        legalBusinessName: 'Phase Three Dealer LLC',
        publicDealerName: 'Phase Three Dealer',
        businessType: 'LLC',
        website: 'https://phase-three.example.com',
        email: 'dealer@phase-three.example.com',
        phone: '+1 212 555 0133',
        businessAddress: {
          line1: '133 Guild Street',
          city: 'New York',
          region: 'NY',
          postalCode: '10013',
          countryCode: 'US',
        },
        contactPerson: 'Phase Three Owner',
        companyDescription:
          'Independent American dealer specializing in documented twentieth-century furniture and decorative arts.',
        specialties: ['Vintage furniture', 'Decorative arts'],
        yearsInBusiness: 12,
        supportingDocuments: [],
      },
      crypto.randomUUID(),
    );
    application = await dealers.submit(
      applicant.id,
      application.organizationId,
      application.version,
      crypto.randomUUID(),
    );
    evidence.dealerSubmitted = { id: application.id, status: application.status };
    application = await dealers.review(
      admin.id,
      application.id,
      { action: 'start_review', version: application.version },
      crypto.randomUUID(),
    );
    application = await dealers.review(
      admin.id,
      application.id,
      { action: 'approve', version: application.version },
      crypto.randomUUID(),
    );
    assert(application.status === 'APPROVED', 'Dealer must be approved');
    evidence.dealerApproved = {
      id: application.id,
      organizationId: application.organizationId,
      status: application.status,
    };

    let product = await catalog.create(
      applicant.id,
      application.organizationId,
      productInputSchema.parse({
        title: `Phase Three Walnut Credenza ${run}`,
        slug: `phase-three-walnut-credenza-${run}`,
        productType: 'Credenza',
        categoryId: category.id,
        condition: 'EXCELLENT',
        quantity: 1,
        quantityAvailable: 1,
        priceMinor: '725000',
        inventorySku: `PH3-${run}`,
        materials: ['Walnut'],
        styles: ['Mid-century modern'],
        provenance: 'Private New York collection.',
      }),
      crypto.randomUUID(),
    );
    await db.productMedia.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        organizationId: application.organizationId,
        productId: product.id,
        sourceUrl: `https://images.example.com/phase-3-${index}.jpg`,
        processingStatus: 'READY' as const,
        moderationStatus: 'APPROVED' as const,
      })),
    });
    product = await catalog.submit(
      applicant.id,
      application.organizationId,
      product.id,
      crypto.randomUUID(),
    );
    product = await catalog.moderate(
      admin.id,
      application.organizationId,
      product.id,
      'reject',
      'Add a precise restoration statement.',
      crypto.randomUUID(),
    );
    product = await catalog.update(
      applicant.id,
      application.organizationId,
      product.id,
      {
        version: product.version,
        restorationNotes: 'Original case retained; finish conserved and hardware documented.',
      },
      crypto.randomUUID(),
    );
    product = await catalog.submit(
      applicant.id,
      application.organizationId,
      product.id,
      crypto.randomUUID(),
    );
    product = await catalog.moderate(
      admin.id,
      application.organizationId,
      product.id,
      'approve',
      undefined,
      crypto.randomUUID(),
    );
    product = await catalog.moderate(
      admin.id,
      application.organizationId,
      product.id,
      'publish',
      undefined,
      crypto.randomUUID(),
    );
    assert(product.status === 'PUBLISHED', 'Product must be published');
    const marketplace = await catalog.publicProduct(product.slug);
    const storefront = await storefronts.product(slug, product.slug);
    assert(marketplace.id === product.id, 'Marketplace must use canonical product');
    assert(storefront.id === product.id, 'Storefront must use canonical product');

    const otherMembership = await db.organizationMember.findFirstOrThrow({
      where: { userId: other.id, organization: { slug: 'second-seller' } },
    });
    let crossTenant = 'unexpected-success';
    try {
      await catalog.sellerProduct(other.id, otherMembership.organizationId, product.id);
    } catch (error) {
      crossTenant =
        typeof error === 'object' && error && 'status' in error
          ? String((error as { status: number }).status)
          : 'error';
    }
    assert(crossTenant === '404', 'Cross-tenant product read must return 404');
    await waitForNotifications(applicant.id, admin.id);
    const [reviews, verifications, notifications, audits] = await Promise.all([
      db.productModerationReview.findMany({ where: { productId: product.id } }),
      db.dealerVerification.findMany({ where: { applicationId: application.id } }),
      db.notification.findMany({
        where: { recipientUserId: { in: [applicant.id, admin.id] } },
      }),
      db.auditLog.count({ where: { organizationId: application.organizationId } }),
    ]);
    evidence.product = {
      id: product.id,
      slug: product.slug,
      status: product.status,
      marketplaceId: marketplace.id,
      storefrontId: storefront.id,
    };
    evidence.moderation = {
      reviews: reviews.map((review) => ({
        submittedVersion: review.submittedVersion,
        status: review.status,
      })),
    };
    evidence.security = { crossTenant };
    evidence.persistence = {
      verifications: verifications.length,
      notifications: notifications.length,
      audits,
    };
  } finally {
    await stopWorker();
  }
  evidence.completedAt = new Date().toISOString();
  evidence.status = 'passed';
}

async function writeEvidence() {
  const directory = resolve(import.meta.dirname, '../../../artifacts/phase-3');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

async function waitForNotifications(applicantUserId: string, adminUserId: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const count = await db.notification.count({
      where: { recipientUserId: { in: [applicantUserId, adminUserId] } },
    });
    if (count >= 4) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error('Phase 3 notifications timed out');
}

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

void main()
  .then(writeEvidence)
  .catch((error) => {
    evidence.status = 'failed';
    evidence.completedAt = new Date().toISOString();
    evidence.error = error instanceof Error ? error.message : String(error);
    console.error(error);
    process.exitCode = 1;
    return writeEvidence();
  })
  .finally(() => db.$disconnect());
