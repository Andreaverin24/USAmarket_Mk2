import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@atlas/database';
import type { PrismaClient } from '@atlas/database';
import type {
  ExtractionProvenance,
  NormalizedExternalListing,
  NormalizedProductDraft,
  NormalizedSourceDescriptor,
} from './normalized-product.js';

const MAX_NORMALIZED_BYTES = 512 * 1024;
const MAX_ATTRIBUTES = 100;
const MAX_IMAGES = 30;

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
    const value = row.normalizedPayload as unknown as NormalizedProductDraft | null;
    if (!value) continue;
    try {
      await db.$transaction(
        async (tx) => {
          validateDraft(value);
          const capturedAt = new Date();
          const sourceInput = normalizeSource(value, job.source);
          const listingInput = normalizeListing(value);
          const source = await tx.catalogSource.upsert({
            where: {
              organizationId_key: {
                organizationId: job.organizationId,
                key: sourceInput.key,
              },
            },
            update: {
              name: sourceInput.name,
              kind: sourceInput.kind,
              baseUrl: sourceInput.baseUrl ?? null,
              adapterKey: sourceInput.adapterKey,
              adapterVersion: sourceInput.adapterVersion,
              enabled: true,
              lastSuccessfulSyncAt: capturedAt,
            },
            create: {
              organizationId: job.organizationId,
              ...sourceInput,
              lastSuccessfulSyncAt: capturedAt,
            },
          });

          const existingListing = await tx.externalListing.findFirst({
            where: {
              sourceId: source.id,
              OR: [
                { externalId: listingInput.externalId },
                ...(listingInput.canonicalUrl ? [{ canonicalUrl: listingInput.canonicalUrl }] : []),
              ],
            },
            include: { product: true },
          });
          const legacySource = source.key.slice(0, 40);
          const legacyProduct =
            existingListing?.product ??
            (job.source === 'web'
              ? null
              : await tx.product.findFirst({
                  where: {
                    organizationId: job.organizationId,
                    OR: [
                      ...(value.externalId
                        ? [{ externalSource: legacySource, externalId: value.externalId }]
                        : []),
                      { inventorySku: value.sku },
                    ],
                  },
                }));
          const canRefresh =
            !legacyProduct ||
            (legacyProduct.status === 'DRAFT' && !legacyProduct.sourceRefreshLocked);

          const categorySlug = slugify(value.productType) || 'collectibles';
          const category = await tx.category.upsert({
            where: { slug: categorySlug },
            update: {},
            create: { slug: categorySlug, name: value.productType },
          });
          const identitySuffix = createHash('sha256')
            .update(`${source.key}:${listingInput.externalId}`)
            .digest('hex')
            .slice(0, 8);
          const productSlug = legacyProduct
            ? legacyProduct.slug
            : await uniqueProductSlug(tx, job.organizationId, value.slug, identitySuffix);
          const inventorySku = legacyProduct
            ? legacyProduct.inventorySku
            : await uniqueInventorySku(tx, job.organizationId, value.sku, identitySuffix);
          const productData = canonicalProductData({
            value,
            categoryId: category.id,
            ...(location?.id ? { locationId: location.id } : {}),
            legacySource,
            productSlug,
            inventorySku,
          });
          const product = legacyProduct
            ? canRefresh
              ? await tx.product.update({
                  where: { id: legacyProduct.id },
                  data: { ...productData, version: { increment: 1 } },
                })
              : legacyProduct
            : await tx.product.create({
                data: {
                  organizationId: job.organizationId,
                  ...productData,
                  status: 'DRAFT',
                },
              });

          const listingData = listingPersistenceData(listingInput, capturedAt);
          const listing = existingListing
            ? await tx.externalListing.update({
                where: { id: existingListing.id },
                data: { ...listingData, productId: product.id },
              })
            : await tx.externalListing.upsert({
                where: {
                  sourceId_externalId: {
                    sourceId: source.id,
                    externalId: listingInput.externalId,
                  },
                },
                update: { ...listingData, productId: product.id },
                create: {
                  organizationId: job.organizationId,
                  sourceId: source.id,
                  productId: product.id,
                  ...listingData,
                },
              });

          await syncInventory(tx, job.organizationId, product.id, listingInput.availability);
          if (canRefresh) {
            await replaceAttributes(tx, job.organizationId, product.id, value);
            await enqueueImages(tx, job.organizationId, product.id, product.title, value);
          }

          const normalizedPayload = jsonValue(value);
          const normalizedJson = JSON.stringify(normalizedPayload);
          if (Buffer.byteLength(normalizedJson, 'utf8') > MAX_NORMALIZED_BYTES)
            throw new Error('Normalized product snapshot exceeds 512 KB');
          const provenance = value.provenance ?? {};
          const contentHash = createHash('sha256')
            .update(
              stableStringify({
                source: sourceInput,
                listing: listingInput,
                product: normalizedPayload,
              }),
            )
            .digest('hex');
          const snapshot = await tx.listingSnapshot.upsert({
            where: { listingId_contentHash: { listingId: listing.id, contentHash } },
            update: {},
            create: {
              organizationId: job.organizationId,
              listingId: listing.id,
              importRowId: row.id,
              contentHash,
              capturedAt,
              captureMethod: value.captureMethod ?? (job.source === 'web' ? 'http' : 'csv'),
              adapterKey: source.adapterKey,
              adapterVersion: source.adapterVersion,
              rawPayload: jsonValue(row.payload),
              normalizedPayload,
              provenance: jsonValue(provenance),
              ...(row.errors ? { validationErrors: jsonValue(row.errors) } : {}),
            },
          });
          await persistEvidence({
            tx,
            organizationId: job.organizationId,
            productId: product.id,
            listingId: listing.id,
            snapshotId: snapshot.id,
            productVersion: product.version,
            selected: canRefresh,
            value,
            provenance,
          });

          await tx.auditLog.create({
            data: {
              organizationId: job.organizationId,
              ...(job.requestedByUserId ? { actorUserId: job.requestedByUserId } : {}),
              action: legacyProduct ? 'catalog.product.reimported' : 'catalog.product.imported',
              resourceType: 'Product',
              resourceId: product.id,
              correlationId: job.correlationId ?? randomUUID(),
              metadata: {
                importJobId: job.id,
                rowNumber: row.rowNumber,
                sourceId: source.id,
                listingId: listing.id,
                snapshotId: snapshot.id,
                canonicalUpdated: canRefresh,
                ...(job.rightsScopeHash ? { rightsScopeHash: job.rightsScopeHash } : {}),
              },
            },
          });
          await tx.outboxEvent.create({
            data: {
              organizationId: job.organizationId,
              aggregateType: 'Product',
              aggregateId: product.id,
              eventType: legacyProduct ? 'catalog.product.reimported' : 'catalog.product.imported',
              payload: {
                productId: product.id,
                importJobId: job.id,
                listingId: listing.id,
                snapshotId: snapshot.id,
              },
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
        },
        {
          maxWait: 10_000,
          timeout: 60_000,
        },
      );
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

function validateDraft(value: NormalizedProductDraft) {
  if (!value.title?.trim() || !value.slug?.trim() || !value.sku?.trim())
    throw new Error('Normalized product draft is incomplete');
  if (!/^\d+$/.test(value.priceMinor)) throw new Error('Price must be integer minor units');
  const currency = value.currency ?? value.listing?.currency ?? 'USD';
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code');
  if (
    value.pieceCount !== undefined &&
    (!Number.isInteger(value.pieceCount) || value.pieceCount < 1)
  )
    throw new Error('Piece count must be a positive integer');
}

function normalizeSource(
  value: NormalizedProductDraft,
  jobSource: string,
): NormalizedSourceDescriptor {
  if (value.source) {
    return {
      ...value.source,
      key: normalizeSourceKey(value.source.key),
      name: value.source.name.trim().slice(0, 200),
      ...(value.source.baseUrl ? { baseUrl: value.source.baseUrl.slice(0, 2000) } : {}),
      adapterKey: value.source.adapterKey.slice(0, 120),
      adapterVersion: value.source.adapterVersion.slice(0, 40),
    };
  }
  const key = normalizeSourceKey(jobSource || value.externalSource || 'manual');
  return {
    key,
    name: key === 'shopify' ? 'Shopify CSV' : key,
    kind: key === 'shopify' ? 'CSV' : key === 'web' ? 'WEBSITE' : 'MANUAL',
    adapterKey: key === 'shopify' ? 'shopify-csv' : `${key}-import`,
    adapterVersion: '1',
  };
}

function normalizeListing(value: NormalizedProductDraft): NormalizedExternalListing {
  const priceMinor = value.listing?.priceMinor ?? value.priceMinor;
  const currency = value.listing?.currency ?? value.currency ?? 'USD';
  const externalId = value.listing?.externalId ?? value.externalId ?? value.sku;
  if (!externalId) throw new Error('External listing identity is missing');
  return {
    externalId: externalId.slice(0, 200),
    ...((value.listing?.canonicalUrl ?? value.sourceUrl)
      ? { canonicalUrl: (value.listing?.canonicalUrl ?? value.sourceUrl)!.slice(0, 2000) }
      : {}),
    sourceSku: (value.listing?.sourceSku ?? value.sku).slice(0, 120),
    title: (value.listing?.title ?? value.title).slice(0, 500),
    saleType: value.listing?.saleType ?? (priceMinor ? 'FIXED_PRICE' : 'UNKNOWN'),
    availability: value.listing?.availability ?? 'AVAILABLE',
    ...(priceMinor ? { priceMinor } : {}),
    ...(currency ? { currency } : {}),
    ...(value.listing?.estimateLowMinor
      ? { estimateLowMinor: value.listing.estimateLowMinor }
      : {}),
    ...(value.listing?.estimateHighMinor
      ? { estimateHighMinor: value.listing.estimateHighMinor }
      : {}),
    ...(value.listing?.auctionSaleName
      ? { auctionSaleName: value.listing.auctionSaleName.slice(0, 240) }
      : {}),
    ...(value.listing?.auctionLotNumber
      ? { auctionLotNumber: value.listing.auctionLotNumber.slice(0, 120) }
      : {}),
    ...(value.listing?.auctionStartsAt ? { auctionStartsAt: value.listing.auctionStartsAt } : {}),
    ...(value.listing?.auctionEndsAt ? { auctionEndsAt: value.listing.auctionEndsAt } : {}),
  };
}

function canonicalProductData(input: {
  value: NormalizedProductDraft;
  categoryId: string;
  locationId?: string;
  legacySource: string;
  productSlug: string;
  inventorySku: string;
}): Omit<Prisma.ProductUncheckedCreateInput, 'organizationId'> {
  const { value } = input;
  return {
    categoryId: input.categoryId,
    ...(input.locationId ? { locationId: input.locationId } : {}),
    externalSource: input.legacySource,
    ...((value.listing?.externalId ?? value.externalId)
      ? { externalId: (value.listing?.externalId ?? value.externalId)!.slice(0, 200) }
      : {}),
    title: value.title.slice(0, 240),
    slug: input.productSlug,
    shortDescription: (value.shortDescription ?? value.description).slice(0, 500),
    description: value.description,
    productType: value.productType.slice(0, 120),
    condition: value.condition,
    conditionDescription: value.conditionDescription ?? null,
    quantity: 1,
    pieceCount: value.pieceCount ?? 1,
    priceMinor: BigInt(value.priceMinor),
    currency: value.currency ?? value.listing?.currency ?? 'USD',
    width: decimal(value.width) ?? null,
    height: decimal(value.height) ?? null,
    depth: decimal(value.depth) ?? null,
    diameter: decimal(value.diameter) ?? null,
    seatHeight: decimal(value.seatHeight) ?? null,
    dimensionUnit: value.dimensionUnit ?? 'in',
    weight: decimal(value.weight) ?? null,
    weightUnit: value.weightUnit ?? 'lb',
    materials: cleanList(value.materials),
    colors: cleanList(value.colors),
    styles: cleanList(value.styles),
    era: value.era?.slice(0, 40) ?? null,
    periods: cleanList(value.periods ?? []),
    maker: value.maker?.slice(0, 240) ?? null,
    designer: value.designer?.slice(0, 240) ?? null,
    manufacturer: value.manufacturer?.slice(0, 240) ?? null,
    modelName: value.modelName?.slice(0, 240) ?? null,
    medium: value.medium?.slice(0, 500) ?? null,
    countryOfOrigin: value.countryOfOrigin?.slice(0, 120) ?? null,
    estimatedYearFrom: value.estimatedYearFrom ?? null,
    estimatedYearTo: value.estimatedYearTo ?? null,
    inventorySku: input.inventorySku,
    authenticityNotes: value.authenticityNotes ?? null,
    provenance: value.provenanceText ?? null,
    restorationNotes: value.restorationNotes ?? null,
    signedDetails: value.signedDetails ?? null,
    editionDetails: value.editionDetails ?? null,
    literature: value.literature ?? null,
    exhibitionHistory: value.exhibitionHistory ?? null,
  };
}

function listingPersistenceData(value: NormalizedExternalListing, capturedAt: Date) {
  return {
    externalId: value.externalId,
    canonicalUrl: value.canonicalUrl ?? null,
    sourceSku: value.sourceSku ?? null,
    sourceTitle: value.title ?? null,
    saleType: value.saleType,
    availability: value.availability,
    priceMinor: value.priceMinor ? BigInt(value.priceMinor) : null,
    currency: value.currency ?? null,
    estimateLowMinor: value.estimateLowMinor ? BigInt(value.estimateLowMinor) : null,
    estimateHighMinor: value.estimateHighMinor ? BigInt(value.estimateHighMinor) : null,
    auctionSaleName: value.auctionSaleName ?? null,
    auctionLotNumber: value.auctionLotNumber ?? null,
    auctionStartsAt: parseDate(value.auctionStartsAt),
    auctionEndsAt: parseDate(value.auctionEndsAt),
    lastSeenAt: capturedAt,
    lastCapturedAt: capturedAt,
  };
}

async function syncInventory(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  availability: NormalizedExternalListing['availability'],
) {
  if (availability === 'UNKNOWN') {
    const existing = await tx.inventoryItem.findUnique({ where: { productId } });
    if (existing) return;
  }
  const available = availability === 'AVAILABLE';
  const quantity = available ? 1 : 0;
  await tx.inventoryItem.upsert({
    where: { productId },
    create: {
      organizationId,
      productId,
      quantityOnHand: quantity,
      quantityAvailable: quantity,
      status: available ? 'AVAILABLE' : 'UNAVAILABLE',
    },
    update: {
      quantityOnHand: quantity,
      quantityAvailable: quantity,
      status: available ? 'AVAILABLE' : 'UNAVAILABLE',
      version: { increment: 1 },
    },
  });
}

async function replaceAttributes(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  value: NormalizedProductDraft,
) {
  await tx.productAttribute.deleteMany({ where: { productId, organizationId } });
  const attributes = [
    ...value.materials.map((facet) => ['material', facet] as const),
    ...value.colors.map((facet) => ['color', facet] as const),
    ...value.styles.map((facet) => ['style', facet] as const),
    ...(value.era ? [['era', value.era] as const] : []),
    ...(value.periods ?? []).map((facet) => ['period', facet] as const),
    ...Object.entries(value.attributes ?? {}).flatMap(([name, facets]) =>
      facets.map((facet) => [name.slice(0, 100), facet.slice(0, 500)] as const),
    ),
  ].slice(0, MAX_ATTRIBUTES);
  if (!attributes.length) return;
  await tx.productAttribute.createMany({
    data: attributes.map(([name, facet], index) => ({
      organizationId,
      productId,
      name: name.trim().toLowerCase(),
      value: facet.trim(),
      normalizedValue: normalizeFacet(facet),
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

async function enqueueImages(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  productTitle: string,
  value: NormalizedProductDraft,
) {
  const imageUrls = [value.imageUrl, ...(value.imageUrls ?? [])]
    .filter((url): url is string => Boolean(url && /^https:\/\//i.test(url)))
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, MAX_IMAGES);
  for (const [sortOrder, imageUrl] of imageUrls.entries()) {
    const media =
      (await tx.productMedia.findFirst({
        where: { organizationId, productId, sourceUrl: imageUrl },
      })) ??
      (await tx.productMedia.create({
        data: {
          organizationId,
          productId,
          sourceUrl: imageUrl,
          altText: productTitle.slice(0, 300),
          sortOrder,
          isPrimary: sortOrder === 0,
          processingStatus: 'PENDING',
        },
      }));
    if (media.processingStatus !== 'READY')
      await tx.outboxEvent.create({
        data: {
          organizationId,
          aggregateType: 'ProductMedia',
          aggregateId: media.id,
          eventType: 'catalog.media.import-requested',
          payload: { mediaId: media.id },
        },
      });
  }
}

async function persistEvidence(input: {
  tx: Prisma.TransactionClient;
  organizationId: string;
  productId: string;
  listingId: string;
  snapshotId: string;
  productVersion: number;
  selected: boolean;
  value: NormalizedProductDraft;
  provenance: Record<string, ExtractionProvenance>;
}) {
  const entries = Object.entries(input.provenance).slice(0, 200);
  if (input.selected && entries.length)
    await input.tx.productFieldEvidence.updateMany({
      where: {
        productId: input.productId,
        fieldPath: { in: entries.map(([path]) => path.slice(0, 200)) },
        isSelected: true,
      },
      data: { isSelected: false },
    });
  for (const [fieldPathRaw, evidence] of entries) {
    const fieldPath = fieldPathRaw.slice(0, 200);
    const fieldValue = getPath(input.value as unknown as Record<string, unknown>, fieldPathRaw);
    await input.tx.productFieldEvidence.upsert({
      where: {
        productId_snapshotId_fieldPath: {
          productId: input.productId,
          snapshotId: input.snapshotId,
          fieldPath,
        },
      },
      update: {
        sourcePath: evidence.source.slice(0, 500),
        confidence: clamp(evidence.confidence, 0, 1),
        ...(fieldValue === undefined ? {} : { value: jsonValue(fieldValue) }),
        isSelected: input.selected,
        appliedProductVersion: input.productVersion,
      },
      create: {
        organizationId: input.organizationId,
        productId: input.productId,
        listingId: input.listingId,
        snapshotId: input.snapshotId,
        fieldPath,
        sourcePath: evidence.source.slice(0, 500),
        confidence: clamp(evidence.confidence, 0, 1),
        ...(fieldValue === undefined ? {} : { value: jsonValue(fieldValue) }),
        isSelected: input.selected,
        appliedProductVersion: input.productVersion,
      },
    });
  }
}

async function uniqueProductSlug(
  tx: Prisma.TransactionClient,
  organizationId: string,
  requested: string,
  suffix: string,
) {
  const base = (slugify(requested) || 'collectible').slice(0, 230);
  const found = await tx.product.findFirst({
    where: { organizationId, slug: base },
    select: { id: true },
  });
  return found ? `${base}-${suffix}`.slice(0, 240) : base;
}

async function uniqueInventorySku(
  tx: Prisma.TransactionClient,
  organizationId: string,
  requested: string,
  suffix: string,
) {
  const base = requested.trim().slice(0, 120) || `SOURCE-${suffix}`;
  const found = await tx.product.findFirst({
    where: { organizationId, inventorySku: base },
    select: { id: true },
  });
  return found ? `${base.slice(0, 111)}-${suffix}` : base;
}

const decimal = (value?: string) =>
  value !== undefined && /^\d+(?:\.\d{1,2})?$/.test(value) ? new Prisma.Decimal(value) : undefined;
const cleanList = (values: string[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 100);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const normalizeSourceKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .slice(0, 160);
export const normalizeFacet = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const jsonValue = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};
const getPath = (value: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
const sanitizeError = (error: unknown) =>
  (error instanceof Error ? error.message : 'Import row failed')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 1000);
