import { describe, expect, it } from 'vitest';
import { transitionDealerStatus } from './dealer-state-machine.js';

describe('dealer application state machine', () => {
  it('supports submit, review, changes and approval', () => {
    expect(transitionDealerStatus('DRAFT', 'submit')).toBe('SUBMITTED');
    expect(transitionDealerStatus('SUBMITTED', 'start_review')).toBe('UNDER_REVIEW');
    expect(transitionDealerStatus('UNDER_REVIEW', 'request_changes', 'Add references')).toBe(
      'CHANGES_REQUESTED',
    );
    expect(transitionDealerStatus('CHANGES_REQUESTED', 'submit')).toBe('SUBMITTED');
    expect(transitionDealerStatus('UNDER_REVIEW', 'approve')).toBe('APPROVED');
  });

  it('requires a reason and rejects invalid transitions', () => {
    expect(() => transitionDealerStatus('UNDER_REVIEW', 'request_changes')).toThrow(
      'Review reason is required',
    );
    expect(() => transitionDealerStatus('DRAFT', 'approve')).toThrow(
      'Cannot approve dealer application from DRAFT',
    );
  });
});
