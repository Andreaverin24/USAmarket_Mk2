import { describe, expect, it } from 'vitest';
import { transitionSupportCaseStatus } from './support-state-machine.js';

describe('SupportCase state machine', () => {
  it('allows support to begin review and resolve a case', () => {
    const reviewing = transitionSupportCaseStatus('OPEN', 'start-review');
    expect(reviewing).toBe('IN_REVIEW');
    expect(transitionSupportCaseStatus(reviewing, 'resolve')).toBe('RESOLVED');
  });

  it('allows a platform operator to resolve an open case directly', () => {
    expect(transitionSupportCaseStatus('OPEN', 'resolve')).toBe('RESOLVED');
  });

  it('rejects state changes after resolution', () => {
    expect(() => transitionSupportCaseStatus('RESOLVED', 'start-review')).toThrow(
      'Cannot start-review support case from RESOLVED',
    );
    expect(() => transitionSupportCaseStatus('RESOLVED', 'resolve')).toThrow(
      'Cannot resolve support case from RESOLVED',
    );
  });
});
