import { describe, expect, it } from 'vitest';
import {
  establishedLinesSnapshot,
  establishedLinesSnapshotProduct,
  snapshotFacets,
} from './established-lines-snapshot';

describe('Established Lines discovery snapshot', () => {
  it('provides all 130 approved source records with usable discovery categories', () => {
    const products = establishedLinesSnapshot();

    expect(products).toHaveLength(130);
    expect(new Set(products.map((product) => product.category.slug)).size).toBeGreaterThan(3);
    expect(products.every((product) => product.organization.slug === 'established-lines')).toBe(
      true,
    );
    expect(
      products.every((product) =>
        product.media[0]?.sourceUrl?.startsWith('https://www.establishedlines.com/'),
      ),
    ).toBe(true);
  });

  it('derives filter facets from the same snapshot', () => {
    const facets = snapshotFacets(establishedLinesSnapshot());

    expect(facets.eras).toContain('1950s');
    expect(facets.colors).toEqual(expect.arrayContaining(['Blue', 'White', 'Gold']));
  });

  it('resolves an internal product route from a snapshot slug', () => {
    const product = establishedLinesSnapshot()[0];

    expect(product).toBeDefined();
    expect(establishedLinesSnapshotProduct(product!.slug)?.id).toBe(product!.id);
    expect(establishedLinesSnapshotProduct(product!.slug)!.media.length).toBeGreaterThan(1);
  });
});
