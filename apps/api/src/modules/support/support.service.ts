import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@atlas/database';
import { DatabaseService } from '../../common/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TenantService } from '../tenancy/tenant.service.js';
import {
  presentSupportCase,
  supportCaseInclude,
  type SupportCaseWithDetails,
} from './support.presenter.js';
import type {
  CreateSupportCaseInput,
  SupportCaseQuery,
  UpdateSupportCaseInput,
} from './support.schemas.js';
import { transitionSupportCaseStatus } from './support-state-machine.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class SupportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
  ) {}

  async buyerCases(userId: string) {
    const cases = await this.db.supportCase.findMany({
      where: { buyerUserId: userId },
      include: supportCaseInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return cases.map(presentSupportCase);
  }

  async buyerCase(userId: string, supportCaseId: string) {
    const supportCase = await this.db.supportCase.findFirst({
      where: { id: supportCaseId, buyerUserId: userId },
      include: supportCaseInclude,
    });
    if (!supportCase) throw new NotFoundException('Support case not found');
    return presentSupportCase(supportCase);
  }

  async createBuyerCase(userId: string, input: CreateSupportCaseInput, correlationId: string) {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, buyerUserId: userId },
        select: { id: true, sellerOrganizationId: true, productTitleSnapshot: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      const supportCase = await tx.supportCase.create({
        data: {
          orderId: order.id,
          buyerUserId: userId,
          category: input.category,
          subject: input.subject,
          status: 'OPEN',
        },
      });
      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: supportCase.id,
          actorUserId: userId,
          action: 'opened',
          toStatus: 'OPEN',
          note: input.message,
        },
      });
      const outbox = await tx.outboxEvent.create({
        data: {
          organizationId: order.sellerOrganizationId,
          aggregateType: 'SupportCase',
          aggregateId: supportCase.id,
          eventType: 'support.opened',
          payload: { supportCaseId: supportCase.id, orderId: order.id, status: 'OPEN' },
        },
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: order.sellerOrganizationId,
          actorUserId: userId,
          action: 'support.opened',
          resourceType: 'SupportCase',
          resourceId: supportCase.id,
          correlationId,
          after: { status: 'OPEN', category: input.category },
        }),
      });
      await this.notifyPlatformSupport(tx, {
        sourceEventId: outbox.id,
        organizationId: order.sellerOrganizationId,
        supportCaseId: supportCase.id,
        subject: 'New buyer support case',
        body: `${order.productTitleSnapshot}: ${input.subject}`,
      });
      return this.presentById(tx, supportCase.id);
    });
  }

  async adminCases(userId: string, query: SupportCaseQuery) {
    await this.tenants.requirePlatformPermission(userId, 'support:read');
    const cases = await this.db.supportCase.findMany({
      ...(query.status ? { where: { status: query.status } } : {}),
      include: supportCaseInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return cases.map(presentSupportCase);
  }

  async adminCase(userId: string, supportCaseId: string) {
    await this.tenants.requirePlatformPermission(userId, 'support:read');
    const supportCase = await this.db.supportCase.findUnique({
      where: { id: supportCaseId },
      include: supportCaseInclude,
    });
    if (!supportCase) throw new NotFoundException('Support case not found');
    return presentSupportCase(supportCase);
  }

  async updateCase(
    userId: string,
    supportCaseId: string,
    input: UpdateSupportCaseInput,
    correlationId: string,
  ) {
    await this.tenants.requirePlatformPermission(userId, 'support:manage');
    return this.db.$transaction(async (tx) => {
      const before = await this.requireCase(tx, supportCaseId);
      const toStatus = transitionSupportCaseStatus(before.status, input.action);
      const updated = await tx.supportCase.updateMany({
        where: { id: before.id, status: before.status, version: input.version },
        data: {
          status: toStatus,
          version: { increment: 1 },
          ...(toStatus === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
        },
      });
      if (!updated.count) throw new ConflictException('Support case version or state changed');
      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: before.id,
          actorUserId: userId,
          action: input.action,
          fromStatus: before.status,
          toStatus,
          ...(input.note ? { note: input.note } : {}),
        },
      });
      const outbox = await tx.outboxEvent.create({
        data: {
          organizationId: before.order.sellerOrganizationId,
          aggregateType: 'SupportCase',
          aggregateId: before.id,
          eventType: `support.${input.action}`,
          payload: { supportCaseId: before.id, orderId: before.orderId, status: toStatus },
        },
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: before.order.sellerOrganizationId,
          actorUserId: userId,
          action: `support.${input.action}`,
          resourceType: 'SupportCase',
          resourceId: before.id,
          correlationId,
          before: { status: before.status },
          after: { status: toStatus },
        }),
      });
      await tx.notification.create({
        data: {
          organizationId: before.order.sellerOrganizationId,
          recipientUserId: before.buyerUserId,
          sourceEventId: outbox.id,
          channel: 'IN_APP',
          type: `support.${input.action}`,
          subject: 'Your support case has been updated',
          body:
            input.note ??
            (toStatus === 'IN_REVIEW'
              ? 'DecorFlavor support is reviewing your case.'
              : 'DecorFlavor support has resolved your case.'),
          payload: { supportCaseId: before.id, orderId: before.orderId, status: toStatus },
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
      return this.presentById(tx, before.id);
    });
  }

  private async notifyPlatformSupport(
    tx: Tx,
    input: {
      sourceEventId: string;
      organizationId: string;
      supportCaseId: string;
      subject: string;
      body: string;
    },
  ) {
    const members = await tx.organizationMember.findMany({
      where: {
        status: 'ACTIVE',
        organization: { type: 'PLATFORM', status: 'ACTIVE' },
        role: {
          permissions: {
            some: {
              permission: { code: { in: ['support:read', 'support:manage', 'platform:admin'] } },
            },
          },
        },
      },
      select: { userId: true },
    });
    if (!members.length) return;
    await tx.notification.createMany({
      data: members.map((member) => ({
        organizationId: input.organizationId,
        recipientUserId: member.userId,
        sourceEventId: input.sourceEventId,
        channel: 'IN_APP' as const,
        type: 'support.opened',
        subject: input.subject,
        body: input.body,
        payload: { supportCaseId: input.supportCaseId },
        status: 'DELIVERED' as const,
        deliveredAt: new Date(),
      })),
    });
  }

  private async requireCase(tx: Tx, supportCaseId: string): Promise<SupportCaseWithDetails> {
    const supportCase = await tx.supportCase.findUnique({
      where: { id: supportCaseId },
      include: supportCaseInclude,
    });
    if (!supportCase) throw new NotFoundException('Support case not found');
    return supportCase;
  }

  private async presentById(tx: Tx, supportCaseId: string) {
    return presentSupportCase(await this.requireCase(tx, supportCaseId));
  }
}
