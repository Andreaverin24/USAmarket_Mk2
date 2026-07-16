import { describe, expect, it } from 'vitest';
import { allowedProductActions, transitionProductStatus } from './product-state-machine.js';

describe('product state machine', () => {
  it.each([
    ['DRAFT', 'submit', 'SUBMITTED'],
    ['NEEDS_CHANGES', 'submit', 'SUBMITTED'],
    ['SUBMITTED', 'approve', 'APPROVED'],
    ['SUBMITTED', 'reject', 'NEEDS_CHANGES'],
    ['APPROVED', 'publish', 'PUBLISHED'],
    ['PUBLISHED', 'archive', 'ARCHIVED'],
  ] as const)('%s --%s--> %s', (from, action, to) => {
    expect(
      transitionProductStatus(from, action, action === 'reject' ? 'Fix provenance' : undefined),
    ).toBe(to);
  });

  it('requires a rejection reason', () => {
    expect(() => transitionProductStatus('SUBMITTED', 'reject')).toThrow(
      'Rejection reason is required',
    );
  });

  it('rejects forbidden transitions and leaves terminal statuses without actions', () => {
    expect(() => transitionProductStatus('DRAFT', 'publish')).toThrow(
      'Cannot publish product from DRAFT',
    );
    expect(allowedProductActions('SOLD')).toEqual([]);
    expect(allowedProductActions('RESERVED')).toEqual([]);
    expect(allowedProductActions('ARCHIVED')).toEqual([]);
  });
});
