import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { cpus, freemem, platform, release, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import {
  discoverNextPageLinks,
  discoverProductLinks,
  extractEra,
  extractProductFromHtml,
  hasUsefulProductMarkup,
  normalizeWebUrl,
} from '@atlas/catalog';
import { createWebCaptureSession } from '../src/web-browser.js';

const siteUrl = 'https://www.establishedlines.com/';
const categoryUrls = ['https://www.establishedlines.com/collections/all'];
const targetProducts = numericArgument('target', 100, 1, 200);
const maxCategoryPages = numericArgument('max-category-pages', 20, 1, 20);
const delayMs = numericArgument('delay-ms', 250, 0, 5_000);
const sourceSnapshotPath = resolve(
  stringArgument('source-snapshot', 'apps/portal/public/pilots/established-lines-30.json'),
);
const outputDirectory = resolve(stringArgument('output-dir', 'apps/portal/public/pilots'));
const rawMetricsPath = resolve(
  stringArgument('metrics-output', 'docs/reports/established-lines-benchmark-100-raw.json'),
);
const newSnapshotPath = resolve(
  stringArgument('new-output', 'apps/portal/public/pilots/established-lines-100-new.json'),
);
const combinedSnapshotPath = resolve(
  stringArgument('combined-output', 'apps/portal/public/pilots/established-lines-catalog.json'),
);
const siteOrigin = new URL(siteUrl).origin;
if (extractEra('c1960s') !== '1960s') {
  throw new Error('The @atlas/catalog runtime is stale; build @atlas/catalog before benchmarking');
}
const capture = createWebCaptureSession(siteUrl);
const startedAt = new Date();
const runStarted = performance.now();
const cpuStarted = process.cpuUsage();
const resourceStarted = process.resourceUsage();
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();

let peakRssBytes = process.memoryUsage().rss;
let peakHeapUsedBytes = process.memoryUsage().heapUsed;
let minimumSystemFreeBytes = freemem();
const memorySampler = setInterval(() => {
  const memory = process.memoryUsage();
  peakRssBytes = Math.max(peakRssBytes, memory.rss);
  peakHeapUsedBytes = Math.max(peakHeapUsedBytes, memory.heapUsed);
  minimumSystemFreeBytes = Math.min(minimumSystemFreeBytes, freemem());
}, 250);
memorySampler.unref();

type SnapshotRow = {
  id: string;
  rowNumber: number;
  status: string;
  payload: Record<string, unknown> & {
    sourceUrl?: string;
    candidate?: Record<string, unknown>;
  };
  normalizedPayload?: Record<string, unknown>;
  errors?: string[];
};

type CatalogSnapshot = {
  id?: string;
  source?: string;
  status?: string;
  totalRows?: number;
  validRows?: number;
  importedRows?: number;
  failedRows?: number;
  createdAt?: string;
  siteUrl?: string;
  categoryUrls?: string[];
  visitedCategoryPages?: string[];
  rows?: SnapshotRow[];
};

type ProductMetric = {
  sequence: number;
  sourceUrl: string;
  finalUrl?: string;
  status: 'VALID' | 'INVALID' | 'FAILED';
  captureMethod?: 'http' | 'browser';
  captureMs?: number;
  extractionMs?: number;
  totalMs: number;
  htmlBytes?: number;
  score?: number;
  completenessPercent?: number;
  imageCount?: number;
  title?: string;
  errors: string[];
};

try {
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(dirname(rawMetricsPath), { recursive: true });
  const sourceSnapshot = JSON.parse(await readFile(sourceSnapshotPath, 'utf8')) as CatalogSnapshot;
  const existingRows = sourceSnapshot.rows ?? [];
  const existingUrls = new Set(
    existingRows.flatMap((row) => {
      const candidate = row.normalizedPayload ?? row.payload.candidate;
      const value = candidate?.sourceUrl ?? row.payload.sourceUrl;
      return typeof value === 'string' ? [normalizeWebUrl(value, siteOrigin)] : [];
    }),
  );
  console.log(
    JSON.stringify({
      event: 'benchmark-started',
      targetProducts,
      excludedExistingProducts: existingUrls.size,
      maxCategoryPages,
      delayMs,
    }),
  );

  const categoryQueue = [...categoryUrls];
  const visitedCategories = new Set<string>();
  const productUrls = new Set<string>();
  const categoryMetrics: Array<{
    url: string;
    method: 'http' | 'browser';
    durationMs: number;
    htmlBytes: number;
    discoveredNewProducts: number;
  }> = [];
  const discoveryStarted = performance.now();

  while (
    categoryQueue.length &&
    visitedCategories.size < maxCategoryPages &&
    productUrls.size < targetProducts
  ) {
    const categoryUrl = categoryQueue.shift();
    if (!categoryUrl || visitedCategories.has(categoryUrl)) continue;
    visitedCategories.add(categoryUrl);
    const pageStarted = performance.now();
    const snapshot = await capture.capture(categoryUrl, 'category');
    const finalUrl = normalizeWebUrl(snapshot.finalUrl, siteOrigin);
    const discovered = discoverProductLinks(snapshot.html, finalUrl, siteOrigin);
    const beforeCount = productUrls.size;
    if (!discovered.length && hasUsefulProductMarkup(snapshot.html, finalUrl)) {
      if (!existingUrls.has(finalUrl)) productUrls.add(finalUrl);
    }
    for (const productUrl of discovered) {
      if (!existingUrls.has(productUrl)) productUrls.add(productUrl);
      if (productUrls.size >= targetProducts) break;
    }
    for (const nextUrl of discoverNextPageLinks(snapshot.html, finalUrl, siteOrigin)) {
      if (!visitedCategories.has(nextUrl) && !categoryQueue.includes(nextUrl)) {
        categoryQueue.push(nextUrl);
      }
    }
    const metric = {
      url: finalUrl,
      method: snapshot.method,
      durationMs: round(performance.now() - pageStarted),
      htmlBytes: Buffer.byteLength(snapshot.html, 'utf8'),
      discoveredNewProducts: productUrls.size - beforeCount,
    };
    categoryMetrics.push(metric);
    console.log(
      JSON.stringify({
        event: 'category-captured',
        page: visitedCategories.size,
        queuedPages: categoryQueue.length,
        totalNewProducts: productUrls.size,
        ...metric,
      }),
    );
  }

  const discoveryMs = round(performance.now() - discoveryStarted);
  const selectedProductUrls = [...productUrls].slice(0, targetProducts);
  if (selectedProductUrls.length < targetProducts) {
    throw new Error(
      `Only ${selectedProductUrls.length} new product URLs were discovered; target is ${targetProducts}`,
    );
  }

  const rows: SnapshotRow[] = [];
  const productMetrics: ProductMetric[] = [];
  const checkpoints: Array<Record<string, number>> = [];
  const productsStarted = performance.now();
  const checkpointTargets = new Set(
    [1, 10, targetProducts].filter((value) => value <= targetProducts),
  );

  for (const [index, productUrl] of selectedProductUrls.entries()) {
    if (index > 0 && delayMs) await delay(delayMs);
    const rowNumber = index + 1;
    const itemStarted = performance.now();
    try {
      const captureStarted = performance.now();
      const snapshot = await capture.capture(productUrl, 'product');
      const captureMs = round(performance.now() - captureStarted);
      const extractionStarted = performance.now();
      const extraction = extractProductFromHtml(snapshot.html, snapshot.finalUrl);
      const extractionMs = round(performance.now() - extractionStarted);
      extraction.candidate.captureMethod = snapshot.method;
      const errors = extraction.errors;
      const status = errors.length ? 'INVALID' : 'VALID';
      rows.push({
        id: `benchmark-100-${rowNumber}`,
        rowNumber,
        status,
        payload: {
          sourceUrl: productUrl,
          finalUrl: snapshot.finalUrl,
          captureMethod: snapshot.method,
          candidate: extraction.candidate as unknown as Record<string, unknown>,
        },
        ...(errors.length ? { errors } : {}),
        ...(!errors.length
          ? { normalizedPayload: extraction.candidate as unknown as Record<string, unknown> }
          : {}),
      });
      productMetrics.push({
        sequence: rowNumber,
        sourceUrl: productUrl,
        finalUrl: snapshot.finalUrl,
        status,
        captureMethod: snapshot.method,
        captureMs,
        extractionMs,
        totalMs: round(performance.now() - itemStarted),
        htmlBytes: Buffer.byteLength(snapshot.html, 'utf8'),
        score: extraction.score,
        completenessPercent: productCompleteness(
          extraction.candidate as unknown as Record<string, unknown>,
        ),
        imageCount: extraction.candidate.imageUrls.length,
        title: extraction.candidate.title,
        errors,
      });
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : 'Extraction failed';
      rows.push({
        id: `benchmark-100-${rowNumber}`,
        rowNumber,
        status: 'INVALID',
        payload: { sourceUrl: productUrl },
        errors: [error],
      });
      productMetrics.push({
        sequence: rowNumber,
        sourceUrl: productUrl,
        status: 'FAILED',
        totalMs: round(performance.now() - itemStarted),
        errors: [error],
      });
    }

    const latest = productMetrics.at(-1);
    console.log(
      JSON.stringify({
        event: 'product-captured',
        completed: rowNumber,
        target: targetProducts,
        status: latest?.status,
        method: latest?.captureMethod,
        totalMs: latest?.totalMs,
        images: latest?.imageCount,
        title: latest?.title ?? productUrl,
      }),
    );

    if (checkpointTargets.has(rowNumber)) {
      const elapsedMs = round(performance.now() - productsStarted);
      const completedMetrics = productMetrics.slice(0, rowNumber);
      const checkpoint = {
        products: rowNumber,
        elapsedMs,
        endToEndElapsedMs: round(performance.now() - runStarted),
        productsPerMinute: round((rowNumber / elapsedMs) * 60_000),
        averageMsPerProduct: round(elapsedMs / rowNumber),
        validProducts: completedMetrics.filter((metric) => metric.status === 'VALID').length,
        failedProducts: completedMetrics.filter((metric) => metric.status === 'FAILED').length,
        rssBytes: process.memoryUsage().rss,
        heapUsedBytes: process.memoryUsage().heapUsed,
        cpuUserMs: round(process.cpuUsage(cpuStarted).user / 1_000),
        cpuSystemMs: round(process.cpuUsage(cpuStarted).system / 1_000),
      };
      checkpoints.push(checkpoint);
      console.log(JSON.stringify({ event: 'checkpoint', ...checkpoint }));
    }
  }

  const finishedAt = new Date();
  const productProcessingMs = round(performance.now() - productsStarted);
  const totalElapsedMs = round(performance.now() - runStarted);
  const validRows = rows.filter((row) => row.status === 'VALID').length;
  const newSnapshot = {
    id: `benchmark-established-lines-100-${startedAt.toISOString()}`,
    source: 'web',
    status: 'VALIDATED',
    totalRows: rows.length,
    validRows,
    importedRows: 0,
    failedRows: rows.length - validRows,
    createdAt: startedAt.toISOString(),
    completedAt: finishedAt.toISOString(),
    siteUrl,
    categoryUrls,
    visitedCategoryPages: [...visitedCategories],
    excludedExistingProducts: existingUrls.size,
    rows,
  };
  const combinedRows = deduplicateRows([...existingRows, ...rows]).map((row, index) => ({
    ...row,
    id: `catalog-${index + 1}`,
    rowNumber: index + 1,
  }));
  const combinedValidRows = combinedRows.filter((row) => row.status === 'VALID').length;
  const combinedSnapshot = {
    id: `established-lines-catalog-${finishedAt.toISOString()}`,
    source: 'web',
    status: 'VALIDATED',
    totalRows: combinedRows.length,
    validRows: combinedValidRows,
    importedRows: 0,
    failedRows: combinedRows.length - combinedValidRows,
    createdAt: startedAt.toISOString(),
    completedAt: finishedAt.toISOString(),
    siteUrl,
    categoryUrls,
    visitedCategoryPages: [...visitedCategories],
    rows: combinedRows,
  };

  clearInterval(memorySampler);
  const cpu = process.cpuUsage(cpuStarted);
  const resource = process.resourceUsage();
  const successfulMetrics = productMetrics.filter((metric) => metric.status !== 'FAILED');
  const captureDurations = successfulMetrics.flatMap((metric) =>
    typeof metric.captureMs === 'number' ? [metric.captureMs] : [],
  );
  const itemDurations = productMetrics.map((metric) => metric.totalMs);
  const htmlBytes = successfulMetrics.flatMap((metric) =>
    typeof metric.htmlBytes === 'number' ? [metric.htmlBytes] : [],
  );
  const completeness = successfulMetrics.flatMap((metric) =>
    typeof metric.completenessPercent === 'number' ? [metric.completenessPercent] : [],
  );
  const imageCounts = successfulMetrics.flatMap((metric) =>
    typeof metric.imageCount === 'number' ? [metric.imageCount] : [],
  );
  const report = {
    schemaVersion: 1,
    benchmark: 'established-lines-100-new-sequential',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    configuration: {
      siteUrl,
      categoryUrls,
      targetProducts,
      excludedExistingProducts: existingUrls.size,
      maxCategoryPages,
      concurrency: 1,
      delayMs,
      checkpoints: [...checkpointTargets].sort((left, right) => left - right),
    },
    scopeNotes: {
      productsArePreviewOnly: true,
      sourceHtmlPersisted: false,
      htmlBytesExcludeBrowserSubresources: true,
      nodeMemoryExcludesChromiumChildProcesses: true,
      checkpointsExcludeCategoryDiscovery: true,
      endToEndCheckpointsIncludeCategoryDiscovery: true,
    },
    discovery: {
      elapsedMs: discoveryMs,
      categoryPages: visitedCategories.size,
      discoveredNewProducts: productUrls.size,
      selectedProducts: selectedProductUrls.length,
      pages: categoryMetrics,
    },
    checkpoints,
    totals: {
      elapsedMs: totalElapsedMs,
      productProcessingMs,
      totalProducts: productMetrics.length,
      validProducts: validRows,
      invalidProducts: productMetrics.filter((metric) => metric.status === 'INVALID').length,
      failedProducts: productMetrics.filter((metric) => metric.status === 'FAILED').length,
      httpCaptures: productMetrics.filter((metric) => metric.captureMethod === 'http').length,
      browserCaptures: productMetrics.filter((metric) => metric.captureMethod === 'browser').length,
      productsPerMinute: round((productMetrics.length / productProcessingMs) * 60_000),
      averageMsPerProduct: round(productProcessingMs / productMetrics.length),
      totalHtmlBytes: sum(htmlBytes),
      totalImages: sum(imageCounts),
    },
    latencyMs: distribution(itemDurations),
    captureLatencyMs: distribution(captureDurations),
    htmlBytes: distribution(htmlBytes),
    completenessPercent: distribution(completeness),
    imagesPerProduct: distribution(imageCounts),
    resources: {
      node: {
        peakRssBytes,
        peakHeapUsedBytes,
        cpuUserMs: round(cpu.user / 1_000),
        cpuSystemMs: round(cpu.system / 1_000),
        maxRssDeltaBytes: Math.max(0, resource.maxRSS - resourceStarted.maxRSS) * 1_024,
        eventLoopDelayMeanMs: round(eventLoop.mean / 1_000_000),
        eventLoopDelayP95Ms: round(eventLoop.percentile(95) / 1_000_000),
        eventLoopDelayMaxMs: round(eventLoop.max / 1_000_000),
      },
      system: {
        platform: platform(),
        release: release(),
        cpuModel: cpus()[0]?.model ?? 'unknown',
        logicalCpuCount: cpus().length,
        totalMemoryBytes: totalmem(),
        minimumFreeMemoryBytes: minimumSystemFreeBytes,
      },
    },
    projections: {
      products1kAtMeasuredRateMs: round((1_000 / productMetrics.length) * productProcessingMs),
      products10kAtMeasuredRateMs: round((10_000 / productMetrics.length) * productProcessingMs),
    },
    dataQuality: {
      productsWithTitle: countField(rows, 'title'),
      productsWithDescription: countField(rows, 'description'),
      productsWithPrice: countField(rows, 'priceMinor'),
      productsWithImages: countArrayField(rows, 'imageUrls'),
      productsWithEra: countField(rows, 'era'),
      productsWithDimensions: rows.filter((row) => {
        const product = row.normalizedPayload ?? row.payload.candidate;
        return Boolean(product?.width || product?.height || product?.depth);
      }).length,
    },
    productMetrics,
    artifacts: {
      newSnapshotPath,
      combinedSnapshotPath,
      rawMetricsPath,
      combinedProducts: combinedRows.length,
    },
  };
  eventLoop.disable();

  await Promise.all([
    writeJson(newSnapshotPath, newSnapshot),
    writeJson(combinedSnapshotPath, combinedSnapshot),
    writeJson(rawMetricsPath, report),
  ]);
  console.log(
    JSON.stringify({ event: 'benchmark-completed', ...report.totals, artifacts: report.artifacts }),
  );
} finally {
  clearInterval(memorySampler);
  eventLoop.disable();
  await capture.close();
}

function numericArgument(name: string, fallback: number, min: number, max: number) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return value;
}

function stringArgument(name: string, fallback: string) {
  return (
    process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
  );
}

function delay(milliseconds: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percentile(sorted: number[], ratio: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

function distribution(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    average: sorted.length ? round(sum(sorted) / sorted.length) : 0,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? 0,
  };
}

function productCompleteness(product: Record<string, unknown>) {
  const checks = [
    Boolean(product.title),
    Boolean(product.description),
    Boolean(product.productType),
    Boolean(product.sku),
    Boolean(product.priceMinor),
    Boolean(product.currency),
    Boolean(product.condition),
    Boolean(product.conditionDescription),
    Boolean(product.width || product.height || product.depth),
    Array.isArray(product.materials) && product.materials.length > 0,
    Array.isArray(product.styles) && product.styles.length > 0,
    Boolean(product.maker || product.designer || product.manufacturer),
    Boolean(product.era),
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0,
    typeof product.listing === 'object' && product.listing !== null,
  ];
  return round((checks.filter(Boolean).length / checks.length) * 100);
}

function rowUrl(row: SnapshotRow) {
  const product = row.normalizedPayload ?? row.payload.candidate;
  const value = product?.sourceUrl ?? row.payload.sourceUrl;
  return typeof value === 'string' ? normalizeWebUrl(value, siteOrigin) : `missing:${row.id}`;
}

function deduplicateRows(rows: SnapshotRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = rowUrl(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countField(rows: SnapshotRow[], field: string) {
  return rows.filter((row) => {
    const product = row.normalizedPayload ?? row.payload.candidate;
    return Boolean(product?.[field]);
  }).length;
}

function countArrayField(rows: SnapshotRow[], field: string) {
  return rows.filter((row) => {
    const product = row.normalizedPayload ?? row.payload.candidate;
    return Array.isArray(product?.[field]) && product[field].length > 0;
  }).length;
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
