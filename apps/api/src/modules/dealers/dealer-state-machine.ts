import type { DealerStatus } from '@atlas/database';

export type DealerAction =
  | 'submit'
  | 'start_review'
  | 'request_changes'
  | 'approve'
  | 'reject'
  | 'suspend';

const transitions: Record<DealerAction, Partial<Record<DealerStatus, DealerStatus>>> = {
  submit: { DRAFT: 'SUBMITTED', CHANGES_REQUESTED: 'SUBMITTED' },
  start_review: { SUBMITTED: 'UNDER_REVIEW' },
  request_changes: { UNDER_REVIEW: 'CHANGES_REQUESTED' },
  approve: { UNDER_REVIEW: 'APPROVED' },
  reject: { UNDER_REVIEW: 'REJECTED' },
  suspend: { APPROVED: 'SUSPENDED' },
};

export function transitionDealerStatus(
  current: DealerStatus,
  action: DealerAction,
  reason?: string,
) {
  if (['request_changes', 'reject', 'suspend'].includes(action) && !reason?.trim())
    throw new Error('Review reason is required');
  const next = transitions[action][current];
  if (!next) throw new Error(`Cannot ${action} dealer application from ${current}`);
  return next;
}
