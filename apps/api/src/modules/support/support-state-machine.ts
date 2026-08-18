import { ConflictException } from '@nestjs/common';
import type { SupportCaseStatus } from '@atlas/database';

export type SupportCaseAction = 'start-review' | 'resolve';

const transitions: Record<
  SupportCaseAction,
  Partial<Record<SupportCaseStatus, SupportCaseStatus>>
> = {
  'start-review': { OPEN: 'IN_REVIEW' },
  resolve: { OPEN: 'RESOLVED', IN_REVIEW: 'RESOLVED' },
};

export function transitionSupportCaseStatus(
  current: SupportCaseStatus,
  action: SupportCaseAction,
): SupportCaseStatus {
  const next = transitions[action][current];
  if (!next) throw new ConflictException(`Cannot ${action} support case from ${current}`);
  return next;
}
