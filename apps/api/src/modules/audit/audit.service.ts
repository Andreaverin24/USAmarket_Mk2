import { Injectable } from '@nestjs/common';
import type { Prisma } from '@atlas/database';

@Injectable()
export class AuditService {
  entry(input: {
    organizationId?: string;
    actorUserId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    correlationId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }) {
    return {
      action: input.action,
      resourceType: input.resourceType,
      correlationId: input.correlationId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.before !== undefined ? { before: input.before } : {}),
      ...(input.after !== undefined ? { after: input.after } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };
  }
}
