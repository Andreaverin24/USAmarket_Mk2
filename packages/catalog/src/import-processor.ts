import { randomUUID } from 'node:crypto';
import { Prisma } from '@atlas/database';
import type { PrismaClient, ProductCondition } from '@atlas/database';

export interface NormalizedShopifyRow {
  externalId?: string;
  title: string;
  slug: string;
  description: string;
  productType: string;
  sku: string;
  priceMinor: string;
  condition: ProductCondition;
  materials: string[];
  colors: string[];
  styles: string[];
  maker?: string;
  imageUrl?: string;
}

export async function processImportJob(
  db: PrismaClient,
  jobId: string,
  leaseOwner = `worker-${randomUUID()}`,
) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + 5 * 60_000);
  const claimed = await db.importJob.updateMany({
    where: {
      id: jobId,
      dryRun: false,
      status: { in: ['PENDING', 'PROCESSING', 'COMPLETED_WITH_ERRORS', 'FAILED'] },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }, { leaseOwner }],
    },
    data: {
      status: 'PROCESSING',
      leaseOwner,
      leaseExpiresAt,
      startedAt: now,
      completedAt: null,
      lastError: null,
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count)
    return db.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { rows: true } });

  const job = await db.importJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      rows: { where: { status: { in: ['VALID', 'FAILED'] } }, orderBy: { rowNumber: 'asc' } },
    },
  });
  const location = await db.location.findFirst({
    where: { organizationId: job.organizationId },
    orderBy: { createdAt: 'asc' },
  });

  for (const row of job.rows) {
    const value = row.normalizedPayload as unknown as NormalizedShopifyRow | null;
    if (!value) continue;
    try {
      const productId = await db.$transaction(async (tx) => {
        const categorySlug = slugify(value.productType) || 'furniture';
        const category = await tx.category.upsert({
          where: { slug: categorySlug },
          update: {},
          create: { slug: categorySlug, name: value.productType },
        });
        const identity: Prisma.ProductWhereInput = value.externalId
          ? {
              organizationId: job.organizationId,
              externalSource: 'shopify',
              externalId: value.externalId,
            }
          : { organizationId: job.organizationId, inventorySku: value.sku };
        const existing = await tx.product.findFirst({ where: identity, select: { id: true } });
        const data = {
          categoryId: category.id,
          ...(location?.id ? { locationId: location.id } : {}),
          externalSource: 'shopify',
          ...(value.externalId ? { externalId: value.externalId } : {}),
          title: value.title,
          slug: value.slug,
          description: value.description,
          shortDescription: value.description.slice(0, 500),
          productType: value.productType,
          condition: value.condition,
          quantity: 1,
          priceMinor: BigInt(value.priceMinor),
          currency: 'USD',
          materials: value.materials,
          colors: value.colors,
          styles: value.styles,
          ...(value.maker ? { maker: value.maker } : {}),
          inventorySku: value.sku,
        } satisfies Prisma.ProductUncheckedUpdateInput;
        const product = existing
          ? await tx.product.update({
              where: { id: existing.id },
              data: { ...data, version: { increment: 1 } },
            })
          : await tx.product.create({
              data: {
                ...data,
                organizationId: job.organizationId,
              } as Prisma.ProductUncheckedCreateInput,
            });
        await tx.inventoryItem.upsert({
          where: { productId: product.id },
          create: {
            organizationId: job.organizationId,
            productId: product.id,
            quantityOnHand: 1,
            quantityAvailable: 1,
          },
          update: {
            quantityOnHand: 1,
            quantityAvailable: 1,
            status: 'AVAILABLE',
            version: { increment: 1 },
          },
        });
        await tx.productAttribute.deleteMany({ where: { productId: product.id } });
        const attributes = [
          ...value.materials.map((facet) => ['material', facet] as const),
          ...value.colors.map((facet) => ['color', facet] as const),
          ...value.styles.map((facet) => ['style', facet] as const),
        ];
        if (attributes.length)
          await tx.productAttribute.createMany({
            data: attributes.map(([name, facet], index) => ({
              organizationId: job.organizationId,
              productId: product.id,
              name,
              value: facet,
              normalizedValue: normalizeFacet(facet),
              sortOrder: index,
            })),
            skipDuplicates: true,
          });
        if (value.imageUrl) {
          const media =
            (await tx.productMedia.findFirst({
              where: {
                organizationId: job.organizationId,
                productId: product.id,
                sourceUrl: value.imageUrl,
              },
            })) ??
            (await tx.productMedia.create({
              data: {
                organizationId: job.organizationId,
                productId: product.id,
                sourceUrl: value.imageUrl,
                altText: product.title,
                isPrimary: true,
                processingStatus: 'PENDING',
              },
            }));
          await tx.outboxEvent.create({
            data: {
              organizationId: job.organizationId,
              aggregateType: 'ProductMedia',
              aggregateId: media.id,
              eventType: 'catalog.media.import-requested',
              payload: { mediaId: media.id },
            },
          });
        }
        await tx.auditLog.create({
          data: {
            organizationId: job.organizationId,
            ...(job.requestedByUserId ? { actorUserId: job.requestedByUserId } : {}),
            action: existing ? 'catalog.product.reimported' : 'catalog.product.imported',
            resourceType: 'Product',
            resourceId: product.id,
            correlationId: job.correlationId ?? randomUUID(),
            metadata: { importJobId: job.id, rowNumber: row.rowNumber },
          },
        });
        await tx.outboxEvent.create({
          data: {
            organizationId: job.organizationId,
            aggregateType: 'Product',
            aggregateId: product.id,
            eventType: existing ? 'catalog.product.reimported' : 'catalog.product.imported',
            payload: { productId: product.id, importJobId: job.id },
          },
        });
        await tx.importRow.update({
          where: { id: row.id },
          data: {
            status: 'IMPORTED',
            productId: product.id,
            errors: Prisma.JsonNull,
            attempts: { increment: 1 },
          },
        });
        return product.id;
      });
      void productId;
    } catch (error) {
      await db.importRow.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          errors: [sanitizeError(error)],
        },
      });
    }
    await db.importJob.updateMany({
      where: { id: job.id, leaseOwner },
      data: { leaseExpiresAt: new Date(Date.now() + 5 * 60_000) },
    });
  }

  const [importedRows, failedRows] = await Promise.all([
    db.importRow.count({ where: { importJobId: job.id, status: 'IMPORTED' } }),
    db.importRow.count({ where: { importJobId: job.id, status: { in: ['INVALID', 'FAILED'] } } }),
  ]);
  return db.importJob.update({
    where: { id: job.id },
    data: {
      importedRows,
      failedRows,
      status: failedRows ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      completedAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null,
    },
    include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
}

export const normalizeFacet = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const sanitizeError = (error: unknown) =>
  (error instanceof Error ? error.message : 'Import row failed')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 1000);
