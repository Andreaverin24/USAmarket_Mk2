import { describe, expect, it } from 'vitest';
import {
  discoverNextPageLinks,
  discoverProductLinks,
  extractProductFromHtml,
  normalizeWebUrl,
  parseWebImportConfig,
} from './web-extraction.js';

describe('public web product extraction', () => {
  it('normalizes a Schema.org Product into a deterministic catalog draft', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Vintage Walnut Cabinet",
            "description": "<p>Hand-finished &amp; restored.</p>",
            "sku": "CAB-42",
            "brand": {"@type":"Brand", "name":"Atelier North"},
            "material": ["Walnut", "Brass"],
            "color": "Brown",
            "image": ["/media/cabinet.jpg", "https://shop.example/media/detail.jpg"],
            "offers": {"@type":"Offer", "price":"4,800.50", "priceCurrency":"USD"},
            "additionalProperty": [
              {"@type":"PropertyValue", "name":"Width", "value":"72 in"}
            ]
          }
        </script>
      </head></html>`;
    const result = extractProductFromHtml(
      html,
      'https://shop.example/products/cabinet?utm_source=test',
    );
    expect(result.errors).toEqual([]);
    expect(result.candidate).toMatchObject({
      sourceUrl: 'https://shop.example/products/cabinet',
      title: 'Vintage Walnut Cabinet',
      description: 'Hand-finished & restored.',
      sku: 'CAB-42',
      maker: 'Atelier North',
      priceMinor: '480050',
      currency: 'USD',
      materials: ['Walnut', 'Brass'],
      colors: ['Brown'],
      imageUrls: [
        'https://shop.example/media/cabinet.jpg',
        'https://shop.example/media/detail.jpg',
      ],
      attributes: { width: ['72 in'] },
    });
    expect(result.candidate.externalId).toHaveLength(64);
    expect(result.candidate.provenance.priceMinor?.source).toBe('jsonld.offers');
  });

  it('uses OpenGraph and rendered specification tables as fallback sources', () => {
    const html = `
      <meta property="og:title" content="Linen Lounge Chair">
      <meta property="product:price:amount" content="1.250,00">
      <meta property="product:price:currency" content="EUR">
      <meta property="og:image" content="https://shop.example/chair.jpg">
      <table><tr><th>Material</th><td>Linen; Oak</td></tr><tr><th>Height</th><td>31 in</td></tr></table>`;
    const result = extractProductFromHtml(html, 'https://shop.example/p/chair');
    expect(result.errors).toEqual([]);
    expect(result.candidate).toMatchObject({
      title: 'Linen Lounge Chair',
      priceMinor: '125000',
      currency: 'EUR',
      materials: ['Linen', 'Oak'],
      attributes: { height: ['31 in'] },
    });
  });

  it('extracts collectible dimensions, availability, condition, pieces, and a deduplicated gallery', () => {
    const html = `
      <meta property="og:site_name" content="EstablishedLines">
      <script type="application/ld+json">
        {
          "@type":"Product",
          "name":"Pair of Leather Post Modern Benches",
          "description":"Height: 21 in (53.34 cm). Width: 70 in. Depth: 16 in. Seat Height: 18 in. Condition: Excellent vintage condition with minor wear.",
          "sku":"LU-8837",
          "brand":{"name":"EstablishedLines"},
          "image":"https://www.establishedlines.com/cdn/shop/files/main.jpg?width=1946",
          "offers":{"price":"2200", "priceCurrency":"USD", "availability":"https://schema.org/InStock"}
        }
      </script>
      <img class="product-gallery" alt="Pair of Leather Post Modern Benches" src="/cdn/shop/files/main.jpg?width=416">
      <img class="product-gallery" alt="Pair of Leather Post Modern Benches" src="/cdn/shop/files/detail.jpg?width=1946">
      <img class="product-gallery" alt="Pair of Leather Post Modern Benches" src="/cdn/shop/files/detail.jpg?width=416">`;
    const result = extractProductFromHtml(
      html,
      'https://www.establishedlines.com/products/post-modern-benches',
    );

    expect(result.errors).toEqual([]);
    expect(result.candidate).toMatchObject({
      pieceCount: 2,
      width: '70',
      height: '21',
      depth: '16',
      seatHeight: '18',
      dimensionUnit: 'in',
      condition: 'EXCELLENT',
      conditionDescription: 'Condition: Excellent vintage condition with minor wear.',
      listing: {
        availability: 'AVAILABLE',
        saleType: 'FIXED_PRICE',
        priceMinor: '220000',
      },
      source: {
        key: 'establishedlines.com',
        adapterKey: 'shopify-html',
      },
    });
    expect(result.candidate.maker).toBeUndefined();
    expect(result.candidate.imageUrls).toEqual([
      'https://www.establishedlines.com/cdn/shop/files/main.jpg?width=1946',
      'https://www.establishedlines.com/cdn/shop/files/detail.jpg?width=1946',
    ]);
  });

  it('discovers ItemList, product-card, and bounded pagination links on the configured origin', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"ItemList","itemListElement":[
          {"@type":"ListItem","item":{"url":"/products/a"}},
          {"@type":"ListItem","url":"https://other.example/products/escape"}
        ]}
      </script>
      <a class="product-card" href="/products/b?utm_medium=email">B</a>
      <a class="product-card" href="/cart">Cart</a>
      <a rel="next" href="/chairs?page=2">Next</a>`;
    expect(
      discoverProductLinks(html, 'https://shop.example/chairs', 'https://shop.example'),
    ).toEqual(['https://shop.example/products/a', 'https://shop.example/products/b']);
    expect(
      discoverNextPageLinks(html, 'https://shop.example/chairs', 'https://shop.example'),
    ).toEqual(['https://shop.example/chairs?page=2']);
  });

  it('rejects unsafe schemes, credentials, and cross-origin categories', () => {
    expect(() => normalizeWebUrl('http://shop.example/products/a')).toThrow('HTTPS');
    expect(() => normalizeWebUrl('https://user:secret@shop.example/products/a')).toThrow(
      'credentials',
    );
    expect(() =>
      parseWebImportConfig({
        siteUrl: 'https://shop.example',
        categoryUrls: ['https://other.example/chairs'],
      }),
    ).toThrow('same origin');
  });
});
