import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from './catalog.service.js';

const product = (id: string, priceMinor: bigint) =>
  ({
    id,
    priceMinor,
    width: null,
    height: null,
    depth: null,
    weight: null,
    diameter: null,
    seatHeight: null,
    externalListings: [],
  }) as any;

describe('CatalogService spotlightProducts', () => {
  it('keeps the random database order and clamps an unsafe requested limit', async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'second' }, { id: 'first' }]),
      product: {
        findMany: vi
          .fn()
          .mockResolvedValue([product('first', 10_000n), product('second', 20_000n)]),
      },
    };
    const service = new CatalogService(db as any, {} as any, {} as any, {} as any);

    const result = await service.spotlightProducts(99);

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw.mock.calls[0]?.[1]).toBe(48);
    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['second', 'first'] } } }),
    );
    expect(result.map((entry) => entry.id)).toEqual(['second', 'first']);
    expect(result.map((entry) => entry.priceMinor)).toEqual(['20000', '10000']);
  });
});
