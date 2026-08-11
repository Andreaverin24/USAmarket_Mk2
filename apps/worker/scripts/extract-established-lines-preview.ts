import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  discoverNextPageLinks,
  discoverProductLinks,
  extractProductFromHtml,
  hasUsefulProductMarkup,
  normalizeWebUrl,
} from '@atlas/catalog';
import { createWebCaptureSession } from '../src/web-browser.js';

const siteUrl = 'https://www.establishedlines.com/';
const categoryUrls = ['https://www.establishedlines.com/collections/all'];
const maxProducts = 30;
const maxCategoryPages = 5;
const siteOrigin = new URL(siteUrl).origin;
const capture = createWebCaptureSession(siteUrl);

try {
  const categoryQueue = [...categoryUrls];
  const visitedCategories = new Set<string>();
  const productUrls = new Set<string>();

  while (
    categoryQueue.length &&
    visitedCategories.size < maxCategoryPages &&
    productUrls.size < maxProducts
  ) {
    const categoryUrl = categoryQueue.shift()!;
    if (visitedCategories.has(categoryUrl)) continue;
    visitedCategories.add(categoryUrl);
    const snapshot = await capture.capture(categoryUrl, 'category');
    const finalUrl = normalizeWebUrl(snapshot.finalUrl, siteOrigin);
    const discovered = discoverProductLinks(snapshot.html, finalUrl, siteOrigin);
    if (!discovered.length && hasUsefulProductMarkup(snapshot.html, finalUrl))
      productUrls.add(finalUrl);
    for (const productUrl of discovered) {
      productUrls.add(productUrl);
      if (productUrls.size >= maxProducts) break;
    }
    for (const nextUrl of discoverNextPageLinks(snapshot.html, finalUrl, siteOrigin))
      if (!visitedCategories.has(nextUrl) && categoryQueue.length < maxCategoryPages)
        categoryQueue.push(nextUrl);
  }

  const rows: Array<Record<string, unknown>> = [];
  let rowNumber = 0;
  for (const productUrl of [...productUrls].slice(0, maxProducts)) {
    rowNumber += 1;
    try {
      const snapshot = await capture.capture(productUrl, 'product');
      const extraction = extractProductFromHtml(snapshot.html, snapshot.finalUrl);
      extraction.candidate.captureMethod = snapshot.method;
      rows.push({
        id: `pilot-${rowNumber}`,
        rowNumber,
        status: extraction.errors.length ? 'INVALID' : 'VALID',
        payload: {
          sourceUrl: productUrl,
          finalUrl: snapshot.finalUrl,
          captureMethod: snapshot.method,
          candidate: extraction.candidate,
        },
        ...(extraction.errors.length ? { errors: extraction.errors } : {}),
        ...(!extraction.errors.length ? { normalizedPayload: extraction.candidate } : {}),
      });
      console.log(
        `[${rowNumber}/${Math.min(productUrls.size, maxProducts)}] ${extraction.errors.length ? 'INVALID' : 'VALID'} ${extraction.candidate.title ?? productUrl}`,
      );
    } catch (error) {
      rows.push({
        id: `pilot-${rowNumber}`,
        rowNumber,
        status: 'INVALID',
        payload: { sourceUrl: productUrl },
        errors: [error instanceof Error ? error.message : 'Extraction failed'],
      });
    }
  }

  const validRows = rows.filter((row) => row.status === 'VALID').length;
  const output = {
    id: `local-established-lines-${Date.now()}`,
    source: 'web',
    status: 'VALIDATED',
    totalRows: rows.length,
    validRows,
    importedRows: 0,
    failedRows: rows.length - validRows,
    createdAt: new Date().toISOString(),
    siteUrl,
    categoryUrls,
    visitedCategoryPages: [...visitedCategories],
    rows,
  };
  const outputPath = resolve('apps/portal/public/pilots/established-lines-30.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(
    JSON.stringify(
      {
        outputPath,
        discoveredProducts: productUrls.size,
        totalRows: rows.length,
        validRows,
        failedRows: rows.length - validRows,
        categoryPages: visitedCategories.size,
      },
      null,
      2,
    ),
  );
} finally {
  await capture.close();
}
