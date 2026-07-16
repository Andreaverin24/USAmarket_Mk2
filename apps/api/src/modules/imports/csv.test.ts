import { describe, expect, it } from 'vitest';
import { parseCsv, priceToMinor, slugify } from './csv.js';

describe('Shopify CSV parser', () => {
  it('handles quoted commas and escaped quotes', () =>
    expect(parseCsv('Title,Body\nChair,"Walnut, linen and ""new"" foam"\n')).toEqual([
      { Title: 'Chair', Body: 'Walnut, linen and "new" foam' },
    ]));
  it('converts decimal prices to integer minor units', () =>
    expect(priceToMinor('4800.50')).toBe(480050n));
  it('creates stable ASCII slugs', () =>
    expect(slugify('Étagère — Brass & Glass')).toBe('etagere-brass-glass'));
});
