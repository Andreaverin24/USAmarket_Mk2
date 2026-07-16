import type { ProductStatus } from '@atlas/database';

export type ProductAction = 'submit' | 'approve' | 'reject' | 'publish' | 'archive';

const transitions: Record<ProductAction, Partial<Record<ProductStatus, ProductStatus>>> = {
  submit: { DRAFT: 'SUBMITTED', NEEDS_CHANGES: 'SUBMITTED' },
  approve: { SUBMITTED: 'APPROVED' },
  reject: { SUBMITTED: 'NEEDS_CHANGES', APPROVED: 'NEEDS_CHANGES' },
  publish: { APPROVED: 'PUBLISHED' },
  archive: {
    DRAFT: 'ARCHIVED',
    NEEDS_CHANGES: 'ARCHIVED',
    APPROVED: 'ARCHIVED',
    PUBLISHED: 'ARCHIVED',
  },
};

export function transitionProductStatus(
  current: ProductStatus,
  action: ProductAction,
  note?: string,
): ProductStatus {
  if (action === 'reject' && !note?.trim()) throw new Error('Rejection reason is required');
  const next = transitions[action][current];
  if (!next) throw new Error(`Cannot ${action} product from ${current}`);
  return next;
}

export function allowedProductActions(current: ProductStatus): ProductAction[] {
  return (Object.keys(transitions) as ProductAction[]).filter(
    (action) => transitions[action][current],
  );
}
