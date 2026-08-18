import { describe, expect, it } from 'vitest';
import type { PublicProduct } from './api';
import { productJsonLd } from './product-jsonld';

describe('Product JSON-LD', () => {
  it('uses canonical product price, seller and availability', () => {
    const product = {
      id: 'product-id',
      title: 'Walnut Lounge Chair',
      slug: 'walnut-lounge-chair',
      shortDescription: 'A chair',
      description: 'A collectible chair',
      priceMinor: '425000',
      currency: 'USD',
      condition: 'EXCELLENT',
      materials: ['Walnut'],
      colors: [],
      styles: [],
      era: null,
      maker: 'Atlas Atelier',
      provenance: null,
      restorationNotes: null,
      width: null,
      height: null,
      depth: null,
      category: { name: 'Seating', slug: 'seating' },
      organization: { name: 'Established Lines', slug: 'established-lines' },
      inventory: { quantityAvailable: 1, status: 'AVAILABLE' },
      attributes: [],
      media: [],
    } satisfies PublicProduct;
    const result = productJsonLd(product, 'https://atlas.test/products/walnut-lounge-chair');
    expect(result['@type']).toBe('Product');
    expect(result.offers).toMatchObject({ price: '4250.00', priceCurrency: 'USD' });
    expect(result.seller.name).toBe('Established Lines');
    expect(result.offers.availability).toBe('https://schema.org/InStock');
  });
});
