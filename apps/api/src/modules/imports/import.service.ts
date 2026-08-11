import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ProductCondition } from '@atlas/database';
import { parseWebImportConfig, type NormalizedShopifyRow } from '@atlas/catalog';
import { DatabaseService } from '../../common/database.service.js';
import { TenantService } from '../tenancy/tenant.service.js';
import { parseCsv, priceToMinor, slugify } from './csv.js';

export type ShopifyColumnMapping = Partial<
  Record<
    | 'externalId'
    | 'title'
    | 'description'
    | 'vendor'
    | 'productType'
    | 'sku'
    | 'price'
    | 'condition'
    | 'materials'
    | 'colors'
    | 'styles'
    | 'imageUrl',
    string
  >
>;

const defaultColumns: Required<ShopifyColumnMapping> = {
  externalId: 'Handle',
  title: 'Title',
  description: 'Body (HTML)',
  vendor: 'Vendor',
  productType: 'Type',
  sku: 'Variant SKU',
  price: 'Variant Price',
  condition: 'Condition',
  materials: 'Materials',
  colors: 'Colors',
  styles: 'Styles',
  imageUrl: 'Image Src',
};

@Injectable()
export class ImportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
  ) {}

  async shopify(
    userId: string,
    organizationId: string,
    input: {
      csv: string;
      dryRun: boolean;
      idempotencyKey: string;
      mapping?: ShopifyColumnMapping;
      correlationId?: string;
    },
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    if (Buffer.byteLength(input.csv, 'utf8') > 2_000_000)
      throw new BadRequestException('CSV exceeds 2 MB');
    let rawRows: Record<string, string>[];
    try {
      rawRows = parseCsv(input.csv);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid CSV');
    }
    if (!rawRows.length || rawRows.length > 5_000)
      throw new BadRequestException('CSV must contain 1-5000 rows');
    const checksum = createHash('sha256').update(input.csv).digest('hex');
    const existing = await this.db.importJob.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: tenant.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (existing) {
      if (existing.checksum !== checksum)
        throw new ConflictException('Idempotency key already belongs to a different CSV');
      return existing;
    }

    const mapping = { ...defaultColumns, ...input.mapping };
    const normalized = rawRows.map((row, index) => this.normalize(row, index + 2, mapping));
    this.markDuplicates(normalized);
    const validRows = normalized.filter((row) => row.value).length;
    return this.db.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          organizationId: tenant.organizationId,
          idempotencyKey: input.idempotencyKey,
          checksum,
          dryRun: input.dryRun,
          status: input.dryRun ? 'VALIDATED' : 'PENDING',
          totalRows: normalized.length,
          validRows,
          failedRows: normalized.length - validRows,
          mapping,
          requestedByUserId: userId,
          correlationId: input.correlationId ?? randomUUID(),
          rows: {
            create: normalized.map((row, index) => ({
              rowNumber: index + 2,
              ...(row.value?.externalId ? { externalId: row.value.externalId } : {}),
              ...(row.value?.sku ? { sku: row.value.sku } : {}),
              status: row.value ? 'VALID' : 'INVALID',
              payload: rawRows[index] as Prisma.InputJsonValue,
              ...(row.value
                ? { normalizedPayload: row.value as unknown as Prisma.InputJsonValue }
                : {}),
              ...(row.errors.length ? { errors: row.errors } : {}),
            })),
          },
        },
        include: { rows: { orderBy: { rowNumber: 'asc' } } },
      });
      if (!input.dryRun && validRows)
        await tx.outboxEvent.create({
          data: {
            organizationId: tenant.organizationId,
            aggregateType: 'ImportJob',
            aggregateId: job.id,
            eventType: 'catalog.import.requested',
            payload: { importJobId: job.id },
          },
        });
      return job;
    });
  }

  async web(
    userId: string,
    organizationId: string,
    input: {
      siteUrl: string;
      categoryUrls: string[];
      maxProducts?: number;
      maxCategoryPages?: number;
      idempotencyKey: string;
      correlationId?: string;
    },
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    let config;
    try {
      config = parseWebImportConfig({
        siteUrl: input.siteUrl,
        categoryUrls: input.categoryUrls,
        ...(input.maxProducts !== undefined ? { maxProducts: input.maxProducts } : {}),
        ...(input.maxCategoryPages !== undefined
          ? { maxCategoryPages: input.maxCategoryPages }
          : {}),
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid web import');
    }
    const checksum = createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const existing = await this.db.importJob.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: tenant.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (existing) {
      if (existing.checksum !== checksum || existing.source !== 'web')
        throw new ConflictException('Idempotency key belongs to a different import request');
      return existing;
    }
    return this.db.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          organizationId: tenant.organizationId,
          idempotencyKey: input.idempotencyKey,
          source: 'web',
          checksum,
          dryRun: true,
          status: 'PENDING',
          mapping: config as unknown as Prisma.InputJsonValue,
          requestedByUserId: userId,
          correlationId: input.correlationId ?? randomUUID(),
        },
        include: { rows: true },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'ImportJob',
          aggregateId: job.id,
          eventType: 'catalog.web-extraction.requested',
          payload: { importJobId: job.id },
        },
      });
      return job;
    });
  }

  async list(userId: string, organizationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:read');
    return this.db.importJob.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { rows: true } } },
    });
  }
  report(userId: string, organizationId: string, jobId: string) {
    return this.tenants.resolve(userId, organizationId, 'catalog:read').then((tenant) =>
      this.db.importJob.findFirstOrThrow({
        where: { id: jobId, organizationId: tenant.organizationId },
        include: { rows: { orderBy: { rowNumber: 'asc' } } },
      }),
    );
  }

  async retry(userId: string, organizationId: string, jobId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    return this.db.$transaction(async (tx) => {
      const job = await tx.importJob.findFirst({
        where: { id: jobId, organizationId: tenant.organizationId, dryRun: false },
      });
      if (!job) throw new NotFoundException('Import job not found');
      const failed = await tx.importRow.updateMany({
        where: { importJobId: job.id, status: 'FAILED' },
        data: { status: 'VALID' },
      });
      if (!failed.count) throw new ConflictException('Import job has no failed rows to retry');
      const updated = await tx.importJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          completedAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: null,
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'ImportJob',
          aggregateId: job.id,
          eventType: 'catalog.import.requested',
          payload: { importJobId: job.id, retry: true },
        },
      });
      return updated;
    });
  }

  async apply(
    userId: string,
    organizationId: string,
    jobId: string,
    input: { rightsConfirmed: true },
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:write');
    return this.db.$transaction(async (tx) => {
      const job = await tx.importJob.findFirst({
        where: { id: jobId, organizationId: tenant.organizationId, source: 'web' },
        include: { rows: true },
      });
      if (!job) throw new NotFoundException('Web import job not found');
      if (job.status !== 'VALIDATED' || !job.dryRun)
        throw new ConflictException('Web import job is not ready to apply');
      if (!job.validRows) throw new ConflictException('Web import has no valid products to apply');
      if (!input.rightsConfirmed) throw new BadRequestException('Rights confirmation is required');
      const currentMapping =
        job.mapping && typeof job.mapping === 'object' && !Array.isArray(job.mapping)
          ? (job.mapping as Record<string, unknown>)
          : {};
      const rightsConfirmedAt = new Date();
      const rightsScopeHash = createHash('sha256')
        .update(`${job.id}:${job.checksum}`)
        .digest('hex');
      const confirmation = {
        rightsConfirmed: true,
        rightsConfirmedByUserId: userId,
        rightsConfirmedAt: rightsConfirmedAt.toISOString(),
        rightsScopeHash,
      };
      const updated = await tx.importJob.update({
        where: { id: job.id },
        data: {
          dryRun: false,
          status: 'PENDING',
          importedRows: 0,
          completedAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: null,
          rightsConfirmedByUserId: userId,
          rightsConfirmedAt,
          rightsScopeHash,
          mapping: { ...currentMapping, ...confirmation } as Prisma.InputJsonValue,
        },
        include: { rows: { orderBy: { rowNumber: 'asc' } } },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: tenant.organizationId,
          aggregateType: 'ImportJob',
          aggregateId: job.id,
          eventType: 'catalog.import.requested',
          payload: { importJobId: job.id, source: 'web', ...confirmation },
        },
      });
      return updated;
    });
  }

  async exportCsv(userId: string, organizationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'catalog:read');
    const products = await this.db.product.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { inventorySku: 'asc' },
    });
    const headers = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Type',
      'Variant SKU',
      'Variant Price',
      'Condition',
      'Materials',
      'Colors',
      'Styles',
      'Status',
    ];
    return [
      headers.join(','),
      ...products.map((product) =>
        [
          product.externalId ?? product.slug,
          product.title,
          product.description ?? '',
          product.maker ?? '',
          product.productType,
          product.inventorySku,
          (Number(product.priceMinor) / 100).toFixed(2),
          product.condition,
          product.materials.join('|'),
          product.colors.join('|'),
          product.styles.join('|'),
          product.status,
        ]
          .map(csvCell)
          .join(','),
      ),
    ].join('\r\n');
  }

  private normalize(
    row: Record<string, string>,
    rowNumber: number,
    mapping: Required<ShopifyColumnMapping>,
  ): { value?: NormalizedShopifyRow; errors: string[] } {
    const errors: string[] = [];
    const read = (key: keyof ShopifyColumnMapping) => row[mapping[key]]?.trim() ?? '';
    const title = read('title');
    const externalId = read('externalId');
    const sku = read('sku');
    const productType = read('productType') || 'Furniture';
    if (!title) errors.push(`Row ${rowNumber}: Title is required`);
    if (!externalId && !sku) errors.push(`Row ${rowNumber}: Handle or Variant SKU is required`);
    let priceMinor = 0n;
    try {
      priceMinor = priceToMinor(read('price'));
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'invalid price'}`);
    }
    const conditionMap: Record<string, ProductCondition> = {
      new: 'NEW',
      excellent: 'EXCELLENT',
      good: 'GOOD',
      fair: 'FAIR',
      restored: 'RESTORED',
      'as-is': 'AS_IS',
    };
    const condition = conditionMap[(read('condition') || 'good').toLowerCase()];
    if (!condition) errors.push(`Row ${rowNumber}: unsupported Condition`);
    const imageUrl = read('imageUrl');
    if (imageUrl && !/^https:\/\//i.test(imageUrl))
      errors.push(`Row ${rowNumber}: Image Src must use HTTPS`);
    if (errors.length) return { errors };
    const list = (value: string) =>
      value
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
    return {
      errors,
      value: {
        title,
        ...(externalId ? { externalId } : {}),
        sku,
        productType,
        slug: slugify(externalId || title),
        description: read('description'),
        priceMinor: priceMinor.toString(),
        condition: condition!,
        materials: list(read('materials')),
        colors: list(read('colors')),
        styles: list(read('styles')),
        ...(read('vendor') ? { maker: read('vendor') } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    };
  }

  private markDuplicates(rows: Array<{ value?: NormalizedShopifyRow; errors: string[] }>) {
    const externalIds = new Set<string>();
    const skus = new Set<string>();
    for (const row of rows) {
      if (!row.value) continue;
      const duplicateExternal = row.value.externalId && externalIds.has(row.value.externalId);
      const duplicateSku = row.value.sku && skus.has(row.value.sku);
      if (duplicateExternal || duplicateSku) {
        row.errors.push('Duplicate external ID or SKU in CSV');
        delete row.value;
        continue;
      }
      if (row.value.externalId) externalIds.add(row.value.externalId);
      skus.add(row.value.sku);
    }
  }
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
