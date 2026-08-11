import { extractProductFromHtml, normalizeWebUrl } from '../src/web-extraction.js';

const requestedUrl = process.argv[2];
if (!requestedUrl) throw new Error('Usage: tsx scripts/inspect-url.ts <public-https-product-url>');
const url = normalizeWebUrl(requestedUrl);
const response = await fetch(url, {
  redirect: 'follow',
  headers: { 'user-agent': 'AtlasPartnerCatalogPilot/1.0' },
});
if (!response.ok) throw new Error(`Product page returned HTTP ${response.status}`);
const html = await response.text();
if (Buffer.byteLength(html, 'utf8') > 5 * 1024 * 1024)
  throw new Error('Product page exceeds the 5 MB extraction limit');
const result = extractProductFromHtml(html, response.url);
const candidate = result.candidate;

console.log(
  JSON.stringify(
    {
      httpStatus: response.status,
      htmlBytes: Buffer.byteLength(html, 'utf8'),
      errors: result.errors,
      score: result.score,
      source: candidate.source,
      listing: candidate.listing,
      title: candidate.title,
      sku: candidate.sku,
      priceMinor: candidate.priceMinor,
      currency: candidate.currency,
      condition: candidate.condition,
      conditionDescription: candidate.conditionDescription,
      dimensions: {
        width: candidate.width,
        height: candidate.height,
        depth: candidate.depth,
        diameter: candidate.diameter,
        seatHeight: candidate.seatHeight,
        unit: candidate.dimensionUnit,
      },
      pieceCount: candidate.pieceCount,
      maker: candidate.maker,
      manufacturer: candidate.manufacturer,
      imageCount: candidate.imageUrls.length,
      firstImages: candidate.imageUrls.slice(0, 3),
      attributeNames: Object.keys(candidate.attributes),
    },
    null,
    2,
  ),
);
