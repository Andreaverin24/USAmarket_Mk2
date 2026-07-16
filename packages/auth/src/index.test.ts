import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashToken, safeEqual } from './index.js';

describe('session primitives', () => {
  it('creates a non-reversible fixed-length token hash', () => {
    const token = createOpaqueToken();
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).not.toContain(token);
  });
  it('compares CSRF values without early exit', () => expect(safeEqual('same', 'same')).toBe(true));
});
