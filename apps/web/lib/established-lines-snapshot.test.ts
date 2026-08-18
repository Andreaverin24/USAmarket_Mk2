import { describe, expect, it } from 'vitest';
import { establishedLinesSnapshot, snapshotFacets } from './established-lines-snapshot';

describe('Established Lines discovery snapshot', () => {
  it('provides all 30 approved source records with usable discovery categories', () => {
    const products = establishedLinesSnapshot();

    expect(products).toHaveLength(30);
    expect(new Set(products.map((product) => product.category.slug)).size).toBeGreaterThan(3);
    expect(products.every((product) => product.organization.slug === 'established-lines')).toBe(true);
    expect(
      products.every((product) =>
        product.sourceListingUrl?.startsWith('https://www.establishedlines.com/products/'),
      ),
    ).toBe(true);
    expect(
      products.every((product) =>
        product.media[0]?.sourceUrl?.startsWith('https://www.establishedlines.com/'),
      ),
    ).toBe(true);
  });

  it('derives filter facets from the same snapshot', () => {
    const facets = snapshotFacets(establishedLinesSnapshot());

    expect(facets.eras).toContain('1950s');
  });
});
