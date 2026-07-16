import { loadEnvFile } from 'node:process';

export default async function globalSetup() {
  loadEnvFile('.env');
  const { prisma } = await import('../packages/database/src/index.js');
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { slug: 'established-lines' },
  });
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'furniture' } });
  const product = await prisma.product.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: 'phase-two-smoke-lounge-chair',
      },
    },
    update: {
      title: 'Phase Two Smoke Lounge Chair',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    create: {
      organizationId: organization.id,
      categoryId: category.id,
      title: 'Phase Two Smoke Lounge Chair',
      slug: 'phase-two-smoke-lounge-chair',
      shortDescription: 'A deterministic public-page smoke fixture.',
      description: 'A collectible lounge chair used to verify the Phase 2 public experience.',
      productType: 'Lounge Chair',
      condition: 'EXCELLENT',
      priceMinor: 425000n,
      currency: 'USD',
      status: 'PUBLISHED',
      materials: ['Walnut', 'Leather'],
      colors: ['Cognac'],
      styles: ['Mid-century modern'],
      maker: 'Atlas Test Atelier',
      inventorySku: 'E2E-PHASE2-001',
      publishedAt: new Date(),
      seoTitle: 'Phase Two Smoke Lounge Chair',
      seoDescription: 'Deterministic smoke fixture for Atlas public catalog.',
    },
  });
  await prisma.inventoryItem.upsert({
    where: { productId: product.id },
    update: { quantityOnHand: 1, quantityAvailable: 1, status: 'AVAILABLE' },
    create: {
      organizationId: organization.id,
      productId: product.id,
      quantityOnHand: 1,
      quantityAvailable: 1,
    },
  });
  await prisma.$disconnect();
}
