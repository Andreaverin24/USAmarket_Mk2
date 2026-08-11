import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient, ProductCondition } from '@atlas/database';
import type {
  ExtractionProvenance,
  NormalizedExternalListing,
  NormalizedSourceDescriptor,
} from './normalized-product.js';

export type WebCapturePurpose = 'category' | 'product';
export type WebCaptureMethod = 'http' | 'browser';

export interface WebPageSnapshot {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  method: WebCaptureMethod;
}

export type WebPageCapture = (url: string, purpose: WebCapturePurpose) => Promise<WebPageSnapshot>;

export interface WebImportConfig {
  siteUrl: string;
  categoryUrls: string[];
  maxProducts: number;
  maxCategoryPages: number;
}

export interface WebProductCandidate {
  source: NormalizedSourceDescriptor;
  listing: NormalizedExternalListing;
  sourceUrl: string;
  externalSource: 'web';
  externalId: string;
  title?: string;
  slug?: string;
  description?: string;
  productType: string;
  sku: string;
  priceMinor?: string;
  currency: string;
  condition: ProductCondition;
  materials: string[];
  colors: string[];
  styles: string[];
  maker?: string;
  designer?: string;
  manufacturer?: string;
  medium?: string;
  conditionDescription?: string;
  pieceCount?: number;
  width?: string;
  height?: string;
  depth?: string;
  diameter?: string;
  seatHeight?: string;
  dimensionUnit?: string;
  weight?: string;
  weightUnit?: string;
  imageUrls: string[];
  attributes: Record<string, string[]>;
  provenance: Record<string, ExtractionProvenance>;
  captureMethod?: WebCaptureMethod;
}

export interface WebProductExtraction {
  candidate: WebProductCandidate;
  errors: string[];
  score: number;
}

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

export function normalizeWebUrl(input: string, expectedOrigin?: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('Only public HTTPS URLs are supported');
  if (url.username || url.password) throw new Error('URLs with embedded credentials are forbidden');
  if (expectedOrigin && url.origin !== expectedOrigin)
    throw new Error('Site and category URLs must use the same origin');
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (TRACKING_PARAMETERS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_'))
      url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}

export function parseWebImportConfig(value: unknown): WebImportConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Web import configuration is missing');
  const input = value as Record<string, unknown>;
  if (typeof input.siteUrl !== 'string') throw new Error('Web import site URL is missing');
  const siteUrl = normalizeWebUrl(input.siteUrl);
  const siteOrigin = new URL(siteUrl).origin;
  if (!Array.isArray(input.categoryUrls) || !input.categoryUrls.length)
    throw new Error('At least one category URL is required');
  const categoryUrls = [
    ...new Set(
      input.categoryUrls.map((url) => {
        if (typeof url !== 'string') throw new Error('Category URL must be a string');
        return normalizeWebUrl(url, siteOrigin);
      }),
    ),
  ];
  const maxProducts = boundedInteger(input.maxProducts, 1, 200, 50);
  const maxCategoryPages = boundedInteger(input.maxCategoryPages, 1, 20, 5);
  return { siteUrl, categoryUrls, maxProducts, maxCategoryPages };
}

export function extractProductFromHtml(html: string, sourceUrl: string): WebProductExtraction {
  const normalizedSourceUrl = normalizeWebUrl(sourceUrl);
  const hash = createHash('sha256').update(normalizedSourceUrl).digest('hex');
  const jsonLd = parseJsonLd(html);
  const product = findTypedNodes(jsonLd, 'Product')[0];
  const meta = parseMeta(html);
  const pairs = extractAttributePairs(html);
  const sourceHost = new URL(normalizedSourceUrl).hostname.toLowerCase().replace(/^www\./, '');
  const sourceName = cleanText(meta.get('og:site_name') ?? sourceHost).slice(0, 200);
  const adapterKey = /cdn\/shop\/|shopify/i.test(html) ? 'shopify-html' : 'generic-jsonld-html';
  const sourceRoot = new URL('/', normalizedSourceUrl).toString();
  const sourceIdentity = sourceHost.split('.')[0] ?? sourceHost;
  const provenance: Record<string, ExtractionProvenance> = {};
  const candidate: WebProductCandidate = {
    source: {
      key: sourceHost,
      name: sourceName,
      kind: 'WEBSITE',
      baseUrl: sourceRoot,
      adapterKey,
      adapterVersion: '1',
    },
    listing: {
      externalId: hash,
      canonicalUrl: normalizedSourceUrl,
      saleType: 'UNKNOWN',
      availability: 'UNKNOWN',
    },
    sourceUrl: normalizedSourceUrl,
    externalSource: 'web',
    externalId: hash,
    description: '',
    productType: 'Furniture',
    sku: `WEB-${hash.slice(0, 12).toUpperCase()}`,
    currency: 'USD',
    condition: 'GOOD',
    materials: [],
    colors: [],
    styles: [],
    imageUrls: [],
    attributes: {},
    provenance,
  };

  const offers = product ? firstOffer(product.offers) : undefined;
  const title = firstText(
    product?.name,
    meta.get('og:title'),
    meta.get('twitter:title'),
    pageTitle(html),
  );
  if (title) {
    candidate.title = cleanText(title).slice(0, 240);
    candidate.listing.title = candidate.title;
    candidate.slug = `${slugify(candidate.title) || 'product'}-${hash.slice(0, 8)}`.slice(0, 240);
    provenance.title = {
      source: product?.name ? 'jsonld.name' : meta.has('og:title') ? 'meta.og:title' : 'html.title',
      confidence: product?.name ? 1 : 0.75,
    };
  }

  const description = firstText(
    product?.description,
    meta.get('og:description'),
    meta.get('description'),
  );
  if (description) {
    candidate.description = cleanText(description).slice(0, 20_000);
    provenance.description = {
      source: product?.description ? 'jsonld.description' : 'meta.description',
      confidence: product?.description ? 0.95 : 0.7,
    };
  }

  const price = firstText(
    offers?.price,
    offers?.lowPrice,
    meta.get('product:price:amount'),
    meta.get('og:price:amount'),
  );
  const priceMinor = price ? decimalPriceToMinor(price) : undefined;
  if (priceMinor !== undefined) {
    candidate.priceMinor = priceMinor;
    candidate.listing.priceMinor = priceMinor;
    candidate.listing.saleType = 'FIXED_PRICE';
    provenance.priceMinor = {
      source:
        offers?.price !== undefined || offers?.lowPrice !== undefined
          ? 'jsonld.offers'
          : 'meta.product:price',
      confidence: offers ? 1 : 0.8,
    };
  }
  const currency = firstText(
    offers?.priceCurrency,
    meta.get('product:price:currency'),
    meta.get('og:price:currency'),
  )?.toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    candidate.currency = currency;
    candidate.listing.currency = currency;
    provenance.currency = {
      source: offers?.priceCurrency ? 'jsonld.offers.priceCurrency' : 'meta.currency',
      confidence: 1,
    };
  } else {
    provenance.currency = { source: 'assumption.usd-first-marketplace', confidence: 0.4 };
  }

  const sku = firstText(product?.sku, product?.mpn, product?.gtin, product?.productID);
  if (sku) {
    candidate.sku = cleanText(sku).slice(0, 120);
    candidate.listing.sourceSku = candidate.sku;
    provenance.sku = { source: 'jsonld.identifier', confidence: 0.95 };
  } else provenance.sku = { source: 'generated.source-url-hash', confidence: 1 };

  const brand = firstText(objectName(product?.brand), pairs.get('brand'));
  const manufacturer = firstText(objectName(product?.manufacturer), pairs.get('manufacturer'));
  const maker = firstText(pairs.get('maker'), manufacturer, brand);
  const isPublisherIdentity = (name?: string) =>
    Boolean(
      name &&
        [sourceIdentity, sourceName].some(
          (sourceValue) => compactIdentity(name) === compactIdentity(sourceValue),
        ),
    );
  if (maker && !isPublisherIdentity(maker)) {
    candidate.maker = cleanText(maker).slice(0, 240);
    provenance.maker = {
      source: pairs.get('maker') ? 'html.attributes.maker' : 'jsonld.manufacturer',
      confidence: pairs.get('maker') ? 0.75 : 0.9,
    };
  }
  if (manufacturer && !isPublisherIdentity(manufacturer))
    candidate.manufacturer = cleanText(manufacturer).slice(0, 240);
  const productType = firstText(product?.category, pairs.get('category'), pairs.get('type'));
  if (productType) {
    candidate.productType = cleanText(productType).slice(0, 120);
    provenance.productType = {
      source: product?.category ? 'jsonld.category' : 'html.attributes',
      confidence: 0.75,
    };
  }

  candidate.materials = uniqueValues([
    ...asTextList(product?.material),
    ...splitList(pairs.get('material')),
    ...splitList(pairs.get('materials')),
  ]);
  candidate.colors = uniqueValues([
    ...asTextList(product?.color),
    ...splitList(pairs.get('color')),
    ...splitList(pairs.get('colors')),
  ]);
  candidate.styles = uniqueValues([
    ...splitList(pairs.get('style')),
    ...splitList(pairs.get('styles')),
  ]);
  if (candidate.materials.length)
    provenance.materials = {
      source: product?.material ? 'jsonld.material' : 'html.attributes',
      confidence: 0.75,
    };
  if (candidate.colors.length)
    provenance.colors = {
      source: product?.color ? 'jsonld.color' : 'html.attributes',
      confidence: 0.75,
    };
  if (candidate.styles.length) provenance.styles = { source: 'html.attributes', confidence: 0.65 };
  const measurements = extractMeasurements(
    [
      candidate.description,
      pairs.get('dimensions'),
      pairs.get('dimension'),
      pairs.get('measurements'),
    ]
      .filter(Boolean)
      .join(' '),
  );
  for (const key of ['width', 'height', 'depth', 'diameter', 'seatHeight', 'weight'] as const) {
    const measured = measurements[key];
    if (measured) {
      candidate[key] = measured;
      provenance[key] = { source: 'description.measurements', confidence: 0.82 };
    }
  }
  if (measurements.dimensionUnit) candidate.dimensionUnit = measurements.dimensionUnit;
  if (measurements.weightUnit) candidate.weightUnit = measurements.weightUnit;
  const pieceCount = inferPieceCount(candidate.title);
  if (pieceCount > 1) {
    candidate.pieceCount = pieceCount;
    provenance.pieceCount = { source: 'title.piece-count', confidence: 0.72 };
  }
  const conditionDescription = extractConditionDescription(
    candidate.description,
    pairs.get('condition'),
  );
  if (conditionDescription) {
    candidate.conditionDescription = conditionDescription;
    provenance.conditionDescription = { source: 'description.condition', confidence: 0.78 };
  }
  const medium = firstText(pairs.get('medium'), pairs.get('technique'));
  if (medium) {
    candidate.medium = cleanText(medium).slice(0, 500);
    provenance.medium = { source: 'html.attributes.medium', confidence: 0.75 };
  }

  const condition = firstText(product?.itemCondition, pairs.get('condition'), conditionDescription);
  if (condition) {
    candidate.condition = mapCondition(condition);
    provenance.condition = {
      source: product?.itemCondition
        ? 'jsonld.itemCondition'
        : pairs.get('condition')
          ? 'html.attributes.condition'
          : 'description.condition',
      confidence: product?.itemCondition ? 0.9 : 0.78,
    };
  } else provenance.condition = { source: 'assumption.good', confidence: 0.35 };

  const availabilitySource = firstText(offers?.availability, pairs.get('availability'));
  candidate.listing.availability = mapAvailability(availabilitySource);
  provenance['listing.availability'] = {
    source: offers?.availability ? 'jsonld.offers.availability' : 'html.attributes.availability',
    confidence: availabilitySource ? 0.9 : 0.3,
  };

  const galleryImages = extractGalleryImages(html, candidate.title ?? '', normalizedSourceUrl);
  const imageValues = [
    ...asUrlList(product?.image),
    ...meta.values('og:image'),
    ...meta.values('twitter:image'),
    ...galleryImages,
  ];
  candidate.imageUrls = deduplicateImageUrls(
    imageValues
      .map((value) => absoluteHttpsUrl(value, normalizedSourceUrl))
      .filter((value): value is string => Boolean(value)),
  ).slice(0, 30);
  if (candidate.imageUrls.length)
    provenance.imageUrls = {
      source: galleryImages.length
        ? 'jsonld/meta/html.img'
        : product?.image
          ? 'jsonld.image'
          : 'meta.image',
      confidence: product?.image || galleryImages.length ? 0.95 : 0.75,
    };

  for (const property of additionalProperties(product))
    addAttribute(candidate.attributes, property.name, property.value);
  for (const [name, value] of pairs)
    if (
      ![
        'brand',
        'maker',
        'category',
        'type',
        'material',
        'materials',
        'color',
        'colors',
        'style',
        'styles',
        'condition',
      ].includes(name)
    )
      addAttribute(candidate.attributes, name, value);

  const errors: string[] = [];
  if (!candidate.title) errors.push('Product title was not found');
  if (candidate.priceMinor === undefined) errors.push('Product price was not found');
  const score =
    Number(Boolean(candidate.title)) * 3 +
    Number(candidate.priceMinor !== undefined) * 2 +
    Number(Boolean(candidate.description)) +
    Number(candidate.imageUrls.length > 0) +
    Number(Boolean(candidate.maker)) +
    Number(Object.keys(candidate.attributes).length > 0);
  return { candidate, errors, score };
}

export function hasUsefulProductMarkup(html: string, sourceUrl: string) {
  try {
    return extractProductFromHtml(html, sourceUrl).score >= 5;
  } catch {
    return false;
  }
}

export function discoverProductLinks(html: string, pageUrl: string, siteOrigin: string) {
  const links: string[] = [];
  const jsonLd = parseJsonLd(html);
  for (const itemList of findTypedNodes(jsonLd, 'ItemList'))
    for (const item of asArray(itemList.itemListElement)) {
      const record = asRecord(item);
      const nested = asRecord(record?.item);
      const value = firstText(
        typeof item === 'string' ? item : undefined,
        record?.url,
        record?.['@id'],
        nested?.url,
        nested?.['@id'],
      );
      const normalized = value ? safeSameOriginUrl(value, pageUrl, siteOrigin) : undefined;
      if (normalized) links.push(normalized);
    }

  const anchorPattern =
    /<a\b([^>]*)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[2] ?? match[3] ?? match[4];
    if (!href) continue;
    const context =
      `${match[1] ?? ''} ${match[5] ?? ''} ${stripMarkup(match[6] ?? '')}`.toLowerCase();
    const normalized = safeSameOriginUrl(decodeEntities(href), pageUrl, siteOrigin);
    if (!normalized) continue;
    const path = new URL(normalized).pathname.toLowerCase();
    const productPath = /\/(products?|items?|p)\//.test(path) || /[-/]product[-/]/.test(path);
    const productContext = /product|itemprop\s*=\s*["']?url|data-product|product-card/.test(
      context,
    );
    if ((productPath || productContext) && !isNonProductPath(path)) links.push(normalized);
  }
  return [...new Set(links)];
}

export function discoverNextPageLinks(html: string, pageUrl: string, siteOrigin: string) {
  const links: string[] = [];
  const anchorPattern =
    /<a\b([^>]*)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[2] ?? match[3] ?? match[4];
    if (!href) continue;
    const context =
      `${match[1] ?? ''} ${match[5] ?? ''} ${stripMarkup(match[6] ?? '')}`.toLowerCase();
    if (
      !/rel\s*=\s*["'][^"']*next|aria-label\s*=\s*["'][^"']*next|\bnext\b|older|›|»/.test(context)
    )
      continue;
    const normalized = safeSameOriginUrl(decodeEntities(href), pageUrl, siteOrigin);
    if (normalized) links.push(normalized);
  }
  return [...new Set(links)];
}

export async function processWebExtractionJob(
  db: PrismaClient,
  jobId: string,
  capturePage: WebPageCapture,
) {
  const claimed = await db.importJob.updateMany({
    where: {
      id: jobId,
      source: 'web',
      dryRun: true,
      status: { in: ['PENDING', 'FAILED'] },
    },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
      completedAt: null,
      lastError: null,
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count)
    return db.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { rows: true } });

  try {
    const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
    const config = parseWebImportConfig(job.mapping);
    const siteOrigin = new URL(config.siteUrl).origin;
    const categoryQueue = [...config.categoryUrls];
    const visitedCategories = new Set<string>();
    const productUrls = new Set<string>();
    const categoryBudget = config.categoryUrls.length * config.maxCategoryPages;

    while (
      categoryQueue.length &&
      visitedCategories.size < categoryBudget &&
      productUrls.size < config.maxProducts
    ) {
      const categoryUrl = categoryQueue.shift()!;
      if (visitedCategories.has(categoryUrl)) continue;
      visitedCategories.add(categoryUrl);
      const snapshot = await capturePage(categoryUrl, 'category');
      const finalUrl = normalizeWebUrl(snapshot.finalUrl, siteOrigin);
      const discovered = discoverProductLinks(snapshot.html, finalUrl, siteOrigin);
      if (!discovered.length && hasUsefulProductMarkup(snapshot.html, finalUrl))
        productUrls.add(finalUrl);
      for (const productUrl of discovered) {
        productUrls.add(productUrl);
        if (productUrls.size >= config.maxProducts) break;
      }
      for (const nextUrl of discoverNextPageLinks(snapshot.html, finalUrl, siteOrigin))
        if (
          !visitedCategories.has(nextUrl) &&
          categoryQueue.length + visitedCategories.size < categoryBudget
        )
          categoryQueue.push(nextUrl);
    }
    if (!productUrls.size)
      throw new Error('No product links were found in the supplied categories');

    const rows: Array<{
      sourceUrl: string;
      payload: Prisma.InputJsonValue;
      normalizedPayload?: Prisma.InputJsonValue;
      externalId?: string;
      sku?: string;
      errors: string[];
    }> = [];
    for (const sourceUrl of [...productUrls].slice(0, config.maxProducts)) {
      try {
        const snapshot = await capturePage(sourceUrl, 'product');
        const finalUrl = normalizeWebUrl(snapshot.finalUrl, siteOrigin);
        const extraction = extractProductFromHtml(snapshot.html, finalUrl);
        extraction.candidate.captureMethod = snapshot.method;
        const payload = jsonValue({
          sourceUrl,
          finalUrl,
          captureMethod: snapshot.method,
          candidate: extraction.candidate,
        });
        rows.push({
          sourceUrl,
          payload,
          ...(extraction.errors.length
            ? {}
            : { normalizedPayload: jsonValue(extraction.candidate) }),
          externalId: extraction.candidate.externalId,
          sku: extraction.candidate.sku,
          errors: extraction.errors,
        });
      } catch (error) {
        rows.push({
          sourceUrl,
          payload: jsonValue({ sourceUrl }),
          errors: [sanitizeExtractionError(error)],
        });
      }
    }
    const validRows = rows.filter((row) => row.normalizedPayload).length;
    return db.$transaction(async (tx) => {
      await tx.importRow.deleteMany({ where: { importJobId: job.id } });
      await tx.importRow.createMany({
        data: rows.map((row, index) => ({
          importJobId: job.id,
          rowNumber: index + 1,
          ...(row.externalId ? { externalId: row.externalId } : {}),
          ...(row.sku ? { sku: row.sku } : {}),
          status: row.normalizedPayload ? 'VALID' : 'INVALID',
          payload: row.payload,
          ...(row.normalizedPayload ? { normalizedPayload: row.normalizedPayload } : {}),
          ...(row.errors.length ? { errors: row.errors } : {}),
        })),
      });
      return tx.importJob.update({
        where: { id: job.id },
        data: {
          status: 'VALIDATED',
          totalRows: rows.length,
          validRows,
          failedRows: rows.length - validRows,
          completedAt: new Date(),
          lastError: null,
        },
        include: { rows: { orderBy: { rowNumber: 'asc' } } },
      });
    });
  } catch (error) {
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        lastError: sanitizeExtractionError(error),
      },
    });
    throw error;
  }
}

function parseJsonLd(html: string) {
  const values: unknown[] = [];
  const pattern =
    /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    if (values.length >= 30) break;
    const source = (match[1] ?? '').trim();
    if (!source || source.length > 1_000_000) continue;
    try {
      values.push(JSON.parse(source));
    } catch {
      // Invalid publisher JSON-LD is ignored and lower-confidence sources remain available.
    }
  }
  return values;
}

function findTypedNodes(values: unknown[], expectedType: string) {
  const found: Record<string, unknown>[] = [];
  const stack = [...values];
  let visited = 0;
  while (stack.length && visited < 20_000) {
    visited += 1;
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    const record = asRecord(value);
    if (!record) continue;
    if (asArray(record['@type']).some((type) => String(type).split('/').pop() === expectedType))
      found.push(record);
    stack.push(...Object.values(record));
  }
  return found;
}

class MetaValues {
  private readonly data = new Map<string, string[]>();
  add(key: string, value: string) {
    const normalized = key.toLowerCase();
    this.data.set(normalized, [...(this.data.get(normalized) ?? []), cleanText(value)]);
  }
  get(key: string) {
    return this.data.get(key.toLowerCase())?.[0];
  }
  has(key: string) {
    return this.data.has(key.toLowerCase());
  }
  values(key: string) {
    return this.data.get(key.toLowerCase()) ?? [];
  }
}

function parseMeta(html: string) {
  const values = new MetaValues();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = attributes.property ?? attributes.name ?? attributes.itemprop;
    if (key && attributes.content) values.add(key, attributes.content);
  }
  return values;
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern))
    attributes[match[1]!.toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  return attributes;
}

function extractAttributePairs(html: string) {
  const pairs = new Map<string, string>();
  const add = (name: string, value: string) => {
    const key = normalizeAttributeName(name);
    const cleaned = cleanText(value);
    if (key && cleaned && key.length <= 100 && cleaned.length <= 500 && !pairs.has(key))
      pairs.set(key, cleaned);
  };
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...(row[1] ?? '').matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(
      (match) => stripMarkup(match[1] ?? ''),
    );
    if (cells.length >= 2) add(cells[0]!, cells.slice(1).join(' '));
  }
  const terms = [...html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)];
  for (const term of terms) add(stripMarkup(term[1] ?? ''), stripMarkup(term[2] ?? ''));
  return pairs;
}

function additionalProperties(product?: Record<string, unknown>) {
  const properties: Array<{ name: string; value: string }> = [];
  for (const value of asArray(product?.additionalProperty)) {
    const record = asRecord(value);
    const name = firstText(record?.name, record?.propertyID);
    const propertyValue = firstText(record?.value, record?.valueReference);
    if (name && propertyValue) properties.push({ name, value: propertyValue });
  }
  return properties;
}

function firstOffer(value: unknown) {
  for (const offer of asArray(value)) {
    const record = asRecord(offer);
    if (record) return record;
  }
  return undefined;
}

function objectName(value: unknown) {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return firstText(record?.name, record?.legalName);
}

function asTextList(value: unknown): string[] {
  return asArray(value).flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') return splitList(String(item));
    const record = asRecord(item);
    return record ? splitList(firstText(record.url, record.contentUrl, record.name) ?? '') : [];
  });
}

function asUrlList(value: unknown): string[] {
  return asArray(value).flatMap((item) => {
    if (typeof item === 'string') return [item];
    const record = asRecord(item);
    const url = firstText(record?.url, record?.contentUrl);
    return url ? [url] : [];
  });
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function pageTitle(html: string) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripMarkup(match[1] ?? '') : undefined;
}

function cleanText(value: string) {
  return decodeEntities(stripMarkup(value)).replace(/\s+/g, ' ').trim();
}

function stripMarkup(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (match, code: string) => decodeCodePoint(match, Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (match, code: string) =>
      decodeCodePoint(match, Number.parseInt(code, 16)),
    );
}

function decodeCodePoint(source: string, code: number) {
  return Number.isInteger(code) &&
    code >= 0 &&
    code <= 0x10ffff &&
    !(code >= 0xd800 && code <= 0xdfff)
    ? String.fromCodePoint(code)
    : source;
}

function decimalPriceToMinor(value: string) {
  let normalized = value.replace(/[^0-9.,-]/g, '');
  if (!normalized) return undefined;
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    normalized = normalized.replace(decimal === ',' ? /\./g : /,/g, '').replace(decimal, '.');
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized =
      decimals === 1 || decimals === 2
        ? normalized.replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (dot >= 0) {
    const decimals = normalized.length - dot - 1;
    if (decimals > 2) normalized = normalized.replace(/\./g, '');
  }
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return String(Math.round(number * 100));
}

function mapCondition(value: string): ProductCondition {
  const normalized = value.toLowerCase();
  if (normalized.includes('newcondition') || /^new\b/.test(normalized)) return 'NEW';
  if (normalized.includes('refurbished') || normalized.includes('restored')) return 'RESTORED';
  if (normalized.includes('excellent')) return 'EXCELLENT';
  if (normalized.includes('fair')) return 'FAIR';
  if (normalized.includes('as-is') || normalized.includes('asis')) return 'AS_IS';
  return 'GOOD';
}
function mapAvailability(value?: string): NormalizedExternalListing['availability'] {
  const normalized = (value ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return 'UNKNOWN';
  if (normalized.includes('reserved') || normalized.includes('hold')) return 'RESERVED';
  if (normalized.includes('sold')) return 'SOLD';
  if (normalized.includes('instock') || normalized.includes('available')) return 'AVAILABLE';
  if (
    normalized.includes('outofstock') ||
    normalized.includes('discontinued') ||
    normalized.includes('unavailable')
  )
    return 'UNAVAILABLE';
  return 'UNKNOWN';
}

function extractMeasurements(value: string) {
  const result: Partial<
    Record<
      | 'width'
      | 'height'
      | 'depth'
      | 'diameter'
      | 'seatHeight'
      | 'weight'
      | 'dimensionUnit'
      | 'weightUnit',
      string
    >
  > = {};
  const dimensionPriority = new Map<string, number>();
  const dimensionPattern =
    /\b(seat\s+height|width|height|depth|diameter)\s*:?\s*(\d+(?:\.\d+)?)\s*(inches?|in\b|\"|centimeters?|cms?|cm\b)/gi;
  for (const match of value.matchAll(dimensionPattern)) {
    const label = (match[1] ?? '').toLowerCase().replace(/\s+/g, '');
    const key = label === 'seatheight' ? 'seatHeight' : label;
    if (!['width', 'height', 'depth', 'diameter', 'seatHeight'].includes(key)) continue;
    const unitText = (match[3] ?? '').toLowerCase();
    const unit = /^(?:in|inch|\")/.test(unitText) ? 'in' : 'cm';
    const priority = unit === 'in' ? 2 : 1;
    if ((dimensionPriority.get(key) ?? 0) >= priority) continue;
    result[key as 'width'] = match[2]!;
    result.dimensionUnit = unit;
    dimensionPriority.set(key, priority);
  }
  const weight = value.match(
    /\bweight\s*:?\s*(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kilograms?|kgs?|kg\b)/i,
  );
  if (weight) {
    result.weight = weight[1]!;
    result.weightUnit = /^(?:kg|kilogram)/i.test(weight[2] ?? '') ? 'kg' : 'lb';
  }
  return result;
}

function inferPieceCount(title?: string) {
  if (!title) return 1;
  const wordNumbers: Record<string, number> = {
    pair: 2,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twelve: 12,
  };
  const normalized = title.toLowerCase();
  if (/\bpair\b/.test(normalized)) return 2;
  const numeric = normalized.match(
    /\b(?:set|suite|group|lot)\s+of\s+(\d{1,2})\b|\b(\d{1,2})[- ]piece\b/,
  );
  if (numeric) return Math.max(1, Math.min(99, Number(numeric[1] ?? numeric[2])));
  const words = normalized.match(
    /\b(?:set|suite|group|lot)\s+of\s+(two|three|four|five|six|seven|eight|nine|ten|twelve)\b/,
  );
  return words ? (wordNumbers[words[1]!] ?? 1) : 1;
}

function extractConditionDescription(description?: string, structured?: string) {
  if (structured) return cleanText(structured).slice(0, 1000);
  if (!description) return undefined;
  const sentences = cleanText(description).split(/(?<=[.!?])\s+/);
  const matching = sentences.filter((sentence) =>
    /\b(condition|wear|patina|restor|refinish|damage|scratch|loss|excellent|as[- ]is)\b/i.test(
      sentence,
    ),
  );
  return matching.length ? matching.slice(0, 3).join(' ').slice(0, 1000) : undefined;
}

function extractGalleryImages(html: string, title: string, baseUrl: string) {
  const images: string[] = [];
  const titleTokens = identityTokens(title);
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (images.length >= 200) break;
    const attributes = parseAttributes(match[0]);
    const altTokens = identityTokens(attributes.alt ?? '');
    const overlap = titleTokens.filter((token) => altTokens.includes(token)).length;
    const titleMatch = titleTokens.length >= 2 && overlap >= Math.min(3, titleTokens.length);
    const mediaContext = /product|gallery|media|lightbox|zoom/i.test(
      `${attributes.class ?? ''} ${attributes.id ?? ''} ${attributes['data-media-id'] ?? ''}`,
    );
    if (!titleMatch && !mediaContext) continue;
    const srcset = attributes.srcset ?? attributes['data-srcset'];
    const srcsetUrl = srcset
      ?.split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean)
      .at(-1);
    const source = srcsetUrl ?? attributes.src ?? attributes['data-src'];
    const absolute = source ? absoluteHttpsUrl(source, baseUrl) : undefined;
    if (absolute) images.push(absolute);
  }
  return images;
}

function deduplicateImageUrls(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    try {
      const url = new URL(value);
      const keyUrl = new URL(url);
      for (const parameter of ['width', 'height', 'crop', 'format'])
        keyUrl.searchParams.delete(parameter);
      keyUrl.searchParams.sort();
      const key = keyUrl.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(url.toString());
    } catch {
      // Invalid publisher image URLs are ignored.
    }
  }
  return result;
}

function identityTokens(value: string) {
  return compactIdentity(value)
    .split(' ')
    .filter((token) => token.length >= 4 && !['with', 'from', 'this', 'that'].includes(token));
}

function compactIdentity(value: string) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(/\s*(?:\||,|;|\/|\band\b)\s*/i)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 30);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function addAttribute(target: Record<string, string[]>, name: string, value: string) {
  const key = normalizeAttributeName(name).slice(0, 100);
  const cleaned = cleanText(value).slice(0, 500);
  if (!key || !cleaned) return;
  target[key] = uniqueValues([...(target[key] ?? []), cleaned]);
}

function normalizeAttributeName(value: string) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function absoluteHttpsUrl(value: string, base: string) {
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeSameOriginUrl(value: string, base: string, siteOrigin: string) {
  try {
    return normalizeWebUrl(new URL(value, base).toString(), siteOrigin);
  } catch {
    return undefined;
  }
}

function isNonProductPath(path: string) {
  return /\/(cart|account|login|register|search|blog|pages?|categories?)\b/.test(path);
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    throw new Error(`Value must be an integer between ${min} and ${max}`);
  return value;
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sanitizeExtractionError(error: unknown) {
  return (error instanceof Error ? error.message : 'Web extraction failed')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 1000);
}
