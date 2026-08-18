import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  ExtractionProvenance,
  NormalizedExternalListing,
  NormalizedProductDraft,
  NormalizedSourceDescriptor,
} from '@atlas/catalog';
import type { ProductCondition } from '@atlas/database';

const fixturePath = resolve(
  import.meta.dirname,
  '../../portal/public/pilots/established-lines-30.json',
);
const establishedLinesHost = 'www.establishedlines.com';
const conditions = new Set<ProductCondition>([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'RESTORED',
  'AS_IS',
]);
const sourceKinds = new Set<NormalizedSourceDescriptor['kind']>([
  'WEBSITE',
  'MARKETPLACE',
  'AUCTION_HOUSE',
  'API',
  'CSV',
  'MANUAL',
]);
const availabilities = new Set<NormalizedExternalListing['availability']>([
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'UNAVAILABLE',
  'UNKNOWN',
]);
const saleTypes = new Set<NormalizedExternalListing['saleType']>([
  'FIXED_PRICE',
  'PRICE_ON_REQUEST',
  'AUCTION',
  'UNKNOWN',
]);
const colourRules: Array<[string, RegExp]> = [
  ['White', /\bwhite\b/],
  ['Blue', /\bblue\b/],
  ['Olive', /\bolive\b/],
  ['Honey', /\bhoney\b/],
  ['Blond', /\bblond\b/],
  ['Gold', /\bgilt\b|\bgold\b/],
  ['Brown', /\bwalnut\b|\bmahogany\b|\bteak\b|\bburl\b|\bwood\b/],
];

export interface EstablishedLinesFixtureRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  normalizedPayload: NormalizedProductDraft;
}

export interface EstablishedLinesLocalFixture {
  fixturePath: string;
  checksum: string;
  rows: EstablishedLinesFixtureRow[];
}

export async function loadEstablishedLinesLocalFixture(): Promise<EstablishedLinesLocalFixture> {
  const raw = await readFile(fixturePath, 'utf8');
  const fixture = record(JSON.parse(raw), 'fixture');
  const rows = array(fixture.rows, 'fixture.rows');
  const totalRows = integer(fixture.totalRows, 'fixture.totalRows');
  const validRows = integer(fixture.validRows, 'fixture.validRows');

  if (fixture.status !== 'VALIDATED') throw new Error('Established Lines fixture is not validated');
  if (totalRows !== rows.length)
    throw new Error('Established Lines fixture totalRows does not match rows');

  const normalizedRows = rows.map((row, index) => normalizeRow(row, index + 1));
  if (validRows !== normalizedRows.length)
    throw new Error('Established Lines fixture validRows does not match valid rows');
  if (!normalizedRows.length) throw new Error('Established Lines fixture has no valid products');

  return {
    fixturePath,
    checksum: createHash('sha256').update(raw).digest('hex'),
    rows: normalizedRows,
  };
}

function normalizeRow(value: unknown, expectedRowNumber: number): EstablishedLinesFixtureRow {
  const row = record(value, `fixture.rows[${expectedRowNumber - 1}]`);
  const rowNumber = integer(row.rowNumber, `fixture.rows[${expectedRowNumber - 1}].rowNumber`);
  if (rowNumber !== expectedRowNumber)
    throw new Error('Established Lines fixture row numbers must be consecutive');
  if (row.status !== 'VALID')
    throw new Error(`Established Lines fixture row ${rowNumber} is not valid`);

  const payload = record(row.payload, `fixture.rows[${rowNumber}].payload`);
  return {
    rowNumber,
    payload,
    normalizedPayload: normalizeCandidate(
      record(payload.candidate, `fixture.rows[${rowNumber}].payload.candidate`),
      rowNumber,
    ),
  };
}

function normalizeCandidate(
  candidate: Record<string, unknown>,
  rowNumber: number,
): NormalizedProductDraft {
  const prefix = `fixture.rows[${rowNumber}].payload.candidate`;
  const condition = text(candidate.condition, `${prefix}.condition`) as ProductCondition;
  const priceMinor = text(candidate.priceMinor, `${prefix}.priceMinor`);
  const imageUrls = texts(candidate.imageUrls, `${prefix}.imageUrls`).map((url, index) =>
    establishedLinesUrl(url, `${prefix}.imageUrls[${index}]`),
  );
  const title = text(candidate.title, `${prefix}.title`);
  if (!conditions.has(condition)) throw new Error(`${prefix}.condition is invalid`);
  if (!/^\d+$/.test(priceMinor)) throw new Error(`${prefix}.priceMinor must be an integer string`);
  if (!imageUrls.length) throw new Error(`${prefix}.imageUrls must not be empty`);

  const optional = optionalTextFields(candidate, prefix, [
    'era',
    'maker',
    'designer',
    'manufacturer',
    'medium',
    'conditionDescription',
    'width',
    'height',
    'depth',
    'diameter',
    'seatHeight',
    'dimensionUnit',
  ] as const);
  const pieceCount = optionalNumber(candidate.pieceCount, `${prefix}.pieceCount`);
  const captureMethod = text(candidate.captureMethod, `${prefix}.captureMethod`) as NonNullable<
    NormalizedProductDraft['captureMethod']
  >;
  if (!['http', 'browser', 'csv', 'api', 'manual'].includes(captureMethod))
    throw new Error(`${prefix}.captureMethod is invalid`);

  return {
    source: normalizeSource(record(candidate.source, `${prefix}.source`), prefix),
    listing: normalizeListing(record(candidate.listing, `${prefix}.listing`), prefix),
    externalSource: text(candidate.externalSource, `${prefix}.externalSource`),
    externalId: text(candidate.externalId, `${prefix}.externalId`),
    sourceUrl: establishedLinesUrl(candidate.sourceUrl, `${prefix}.sourceUrl`),
    title,
    slug: text(candidate.slug, `${prefix}.slug`),
    description: text(candidate.description, `${prefix}.description`),
    productType: text(candidate.productType, `${prefix}.productType`),
    sku: text(candidate.sku, `${prefix}.sku`),
    priceMinor,
    currency: currency(candidate.currency, `${prefix}.currency`),
    condition,
    materials: texts(candidate.materials, `${prefix}.materials`),
    colors: derivedColours(title, texts(candidate.colors, `${prefix}.colors`)),
    styles: texts(candidate.styles, `${prefix}.styles`),
    imageUrls,
    attributes: textListRecord(candidate.attributes, `${prefix}.attributes`),
    provenance: provenance(candidate.provenance, `${prefix}.provenance`),
    captureMethod,
    ...(pieceCount === undefined ? {} : { pieceCount }),
    ...optional,
  };
}

function derivedColours(title: string, provided: string[]) {
  const fromTitle = colourRules
    .filter(([, expression]) => expression.test(title.toLowerCase()))
    .map(([colour]) => colour);
  return [...new Set([...provided, ...fromTitle])];
}

function normalizeSource(
  value: Record<string, unknown>,
  prefix: string,
): NormalizedSourceDescriptor {
  const kind = text(value.kind, `${prefix}.source.kind`) as NormalizedSourceDescriptor['kind'];
  if (!sourceKinds.has(kind)) throw new Error(`${prefix}.source.kind is invalid`);
  return {
    key: text(value.key, `${prefix}.source.key`),
    name: text(value.name, `${prefix}.source.name`),
    kind,
    baseUrl: establishedLinesUrl(value.baseUrl, `${prefix}.source.baseUrl`),
    adapterKey: text(value.adapterKey, `${prefix}.source.adapterKey`),
    adapterVersion: text(value.adapterVersion, `${prefix}.source.adapterVersion`),
  };
}

function normalizeListing(
  value: Record<string, unknown>,
  prefix: string,
): NormalizedExternalListing {
  const availability = text(
    value.availability,
    `${prefix}.listing.availability`,
  ) as NormalizedExternalListing['availability'];
  const saleType = text(
    value.saleType,
    `${prefix}.listing.saleType`,
  ) as NormalizedExternalListing['saleType'];
  const priceMinor = optionalText(value.priceMinor, `${prefix}.listing.priceMinor`);
  if (!availabilities.has(availability))
    throw new Error(`${prefix}.listing.availability is invalid`);
  if (!saleTypes.has(saleType)) throw new Error(`${prefix}.listing.saleType is invalid`);
  if (priceMinor !== undefined && !/^\d+$/.test(priceMinor))
    throw new Error(`${prefix}.listing.priceMinor must be an integer string`);
  return {
    externalId: text(value.externalId, `${prefix}.listing.externalId`),
    canonicalUrl: establishedLinesUrl(value.canonicalUrl, `${prefix}.listing.canonicalUrl`),
    sourceSku: text(value.sourceSku, `${prefix}.listing.sourceSku`),
    title: text(value.title, `${prefix}.listing.title`),
    saleType,
    availability,
    ...(priceMinor === undefined ? {} : { priceMinor }),
    ...(value.currency === undefined
      ? {}
      : { currency: currency(value.currency, `${prefix}.listing.currency`) }),
  };
}

function establishedLinesUrl(value: unknown, path: string): string {
  const url = new URL(text(value, path));
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== establishedLinesHost)
    throw new Error(`${path} must be an HTTPS URL on ${establishedLinesHost}`);
  if (url.username || url.password) throw new Error(`${path} must not contain credentials`);
  return url.toString();
}

function provenance(value: unknown, path: string): Record<string, ExtractionProvenance> {
  const input = record(value, path);
  return Object.fromEntries(
    Object.entries(input).map(([field, item]) => {
      const entry = record(item, `${path}.${field}`);
      const confidence = number(entry.confidence, `${path}.${field}.confidence`);
      if (confidence < 0 || confidence > 1)
        throw new Error(`${path}.${field}.confidence is invalid`);
      return [field, { source: text(entry.source, `${path}.${field}.source`), confidence }];
    }),
  );
}

function optionalTextFields<T extends readonly string[]>(
  value: Record<string, unknown>,
  prefix: string,
  fields: T,
): Partial<Record<T[number], string>> {
  return Object.fromEntries(
    fields.flatMap((field) => {
      const item = optionalText(value[field], `${prefix}.${field}`);
      return item === undefined ? [] : [[field, item]];
    }),
  ) as Partial<Record<T[number], string>>;
}

function textListRecord(value: unknown, path: string): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(record(value, path)).map(([key, item]) => [key, texts(item, `${path}.${key}`)]),
  );
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

function texts(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => text(item, `${path}[${index}]`));
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

function optionalText(value: unknown, path: string): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : text(value, path);
}

function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${path} must be a number`);
  return value;
}

function integer(value: unknown, path: string): number {
  const result = number(value, path);
  if (!Number.isInteger(result)) throw new Error(`${path} must be an integer`);
  return result;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  return value === undefined || value === null ? undefined : number(value, path);
}

function currency(value: unknown, path: string): string {
  const result = text(value, path).toUpperCase();
  if (!/^[A-Z]{3}$/.test(result)) throw new Error(`${path} must be an ISO currency`);
  return result;
}
