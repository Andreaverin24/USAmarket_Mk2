import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DealerVerificationAction, Prisma } from '@atlas/database';
import { DatabaseService } from '../../common/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TenantService } from '../tenancy/tenant.service.js';
import type {
  CreateDealerApplication,
  DealerReviewInput,
  UpdateDealerApplication,
} from './dealer.schemas.js';
import { transitionDealerStatus, type DealerAction } from './dealer-state-machine.js';

const applicationInclude = {
  organization: { select: { id: true, slug: true, name: true, status: true } },
  applicant: { select: { id: true, displayName: true } },
  reviewedBy: { select: { id: true, displayName: true } },
  verifications: {
    orderBy: { createdAt: 'asc' as const },
    include: { reviewer: { select: { id: true, displayName: true } } },
  },
};

@Injectable()
export class DealerService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
  ) {}

  mine(userId: string) {
    return this.db.dealerApplication.findMany({
      where: {
        organization: { members: { some: { userId, status: 'ACTIVE' } } },
      },
      include: applicationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async owned(userId: string, organizationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'dealer:application:read');
    const application = await this.db.dealerApplication.findFirst({
      where: { organizationId: tenant.organizationId },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Dealer application not found');
    return application;
  }

  async create(userId: string, input: CreateDealerApplication, correlationId: string) {
    const existing = await this.db.organization.findUnique({
      where: { slug: input.organizationSlug },
      select: {
        id: true,
        dealerApplication: { select: { applicantUserId: true } },
      },
    });
    if (existing)
      throw new ConflictException(
        existing.dealerApplication?.applicantUserId === userId
          ? 'Dealer application already exists'
          : 'Organization slug is unavailable',
      );
    const permissionCodes = [
      'organization:members:read',
      'organization:settings:write',
      'dealer:application:read',
      'dealer:application:write',
      'catalog:read',
      'catalog:write',
      'catalog:submit',
      'storefront:write',
      'notifications:read',
    ];
    return this.db.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });
      if (permissions.length !== permissionCodes.length)
        throw new ConflictException('Dealer role permissions are not seeded');
      const organization = await tx.organization.create({
        data: {
          slug: input.organizationSlug,
          name: input.organizationName,
          type: 'SELLER',
        },
      });
      const role = await tx.role.create({
        data: {
          organizationId: organization.id,
          code: `${organization.slug}:OWNER`,
          name: 'OWNER',
          permissions: {
            create: permissions.map(({ id }) => ({ permissionId: id })),
          },
        },
      });
      await tx.organizationMember.create({
        data: { organizationId: organization.id, userId, roleId: role.id },
      });
      await tx.storefront.create({
        data: { organizationId: organization.id, slug: organization.slug, status: 'DRAFT' },
      });
      const application = await tx.dealerApplication.create({
        data: {
          organizationId: organization.id,
          applicantUserId: userId,
          ...this.applicationData(input),
        },
      });
      await tx.dealerProfile.create({
        data: {
          organizationId: organization.id,
          publicDealerName: input.publicDealerName,
          website: input.website ?? null,
          description: input.companyDescription,
          specialties: input.specialties,
          yearsInBusiness: input.yearsInBusiness,
        },
      });
      const event = await tx.outboxEvent.create({
        data: {
          organizationId: organization.id,
          aggregateType: 'DealerApplication',
          aggregateId: application.id,
          eventType: 'dealer.application.created',
          payload: { applicationId: application.id, applicantUserId: userId },
        },
      });
      await tx.auditLog.create({
        data: this.audit.entry({
          organizationId: organization.id,
          actorUserId: userId,
          action: 'dealer.application.created',
          resourceType: 'DealerApplication',
          resourceId: application.id,
          correlationId,
          after: { status: application.status, version: application.version },
          metadata: { sourceEventId: event.id },
        }),
      });
      return tx.dealerApplication.findUniqueOrThrow({
        where: { id: application.id },
        include: applicationInclude,
      });
    });
  }

  async update(
    userId: string,
    organizationId: string,
    input: UpdateDealerApplication,
    correlationId: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'dealer:application:write');
    const { version, ...changes } = input;
    return this.db.$transaction(async (tx) => {
      const result = await tx.dealerApplication.updateMany({
        where: {
          organizationId: tenant.organizationId,
          version,
          status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
        },
        data: {
          ...(changes as Prisma.DealerApplicationUpdateManyMutationInput),
          reviewReason: null,
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new ConflictException('Application version or state changed');
      const application = await tx.dealerApplication.findUniqueOrThrow({
        where: { organizationId: tenant.organizationId },
        include: applicationInclude,
      });
      await tx.dealerProfile.update({
        where: { organizationId: tenant.organizationId },
        data: {
          publicDealerName: application.publicDealerName,
          website: application.website,
          description: application.companyDescription,
          specialties: application.specialties,
          yearsInBusiness: application.yearsInBusiness,
          version: { increment: 1 },
        },
      });
      await this.writeLifecycle(
        tx,
        application,
        userId,
        correlationId,
        'dealer.application.updated',
      );
      return application;
    });
  }

  async submit(userId: string, organizationId: string, version: number, correlationId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'dealer:application:write');
    return this.db.$transaction(async (tx) => {
      const before = await tx.dealerApplication.findFirst({
        where: { organizationId: tenant.organizationId },
      });
      if (!before) throw new NotFoundException('Dealer application not found');
      const to = this.next(before.status, 'submit');
      const result = await tx.dealerApplication.updateMany({
        where: { id: before.id, status: before.status, version },
        data: {
          status: to,
          submittedAt: new Date(),
          reviewReason: null,
          reviewedAt: null,
          reviewedByUserId: null,
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new ConflictException('Application version or state changed');
      await tx.dealerProfile.update({
        where: { organizationId: tenant.organizationId },
        data: { status: to, version: { increment: 1 } },
      });
      const application = await tx.dealerApplication.findUniqueOrThrow({
        where: { id: before.id },
        include: applicationInclude,
      });
      await this.writeLifecycle(
        tx,
        application,
        userId,
        correlationId,
        'dealer.application.submitted',
        before.status,
      );
      return application;
    });
  }

  async reviewQueue(userId: string, status?: string) {
    await this.tenants.requirePlatformPermission(userId, 'dealer:review');
    const allowed = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
    ];
    return this.db.dealerApplication.findMany({
      ...(status && allowed.includes(status) ? { where: { status: status as never } } : {}),
      include: applicationInclude,
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async adminDetail(userId: string, applicationId: string) {
    await this.tenants.requirePlatformPermission(userId, 'dealer:review');
    const application = await this.db.dealerApplication.findUnique({
      where: { id: applicationId },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Dealer application not found');
    return application;
  }

  async review(
    userId: string,
    applicationId: string,
    input: DealerReviewInput,
    correlationId: string,
  ) {
    await this.tenants.requirePlatformPermission(userId, 'dealer:review');
    return this.db.$transaction(async (tx) => {
      const before = await tx.dealerApplication.findUnique({ where: { id: applicationId } });
      if (!before) throw new NotFoundException('Dealer application not found');
      const to = this.next(before.status, input.action, input.reason);
      const result = await tx.dealerApplication.updateMany({
        where: { id: before.id, status: before.status, version: input.version },
        data: {
          status: to,
          reviewReason: input.reason ?? null,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new ConflictException('Application version or state changed');
      await tx.dealerVerification.create({
        data: {
          organizationId: before.organizationId,
          applicationId: before.id,
          reviewerUserId: userId,
          action: this.verificationAction(input.action),
          fromStatus: before.status,
          toStatus: to,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.internalNote ? { internalNote: input.internalNote } : {}),
        },
      });
      await tx.dealerProfile.update({
        where: { organizationId: before.organizationId },
        data: {
          status: to,
          ...(to === 'APPROVED'
            ? {
                publicDealerName: before.publicDealerName,
                website: before.website,
                description: before.companyDescription,
                specialties: before.specialties,
                yearsInBusiness: before.yearsInBusiness,
                approvedAt: new Date(),
                suspendedAt: null,
              }
            : {}),
          ...(to === 'SUSPENDED' ? { suspendedAt: new Date() } : {}),
          version: { increment: 1 },
        },
      });
      if (to === 'APPROVED')
        await tx.storefront.updateMany({
          where: { organizationId: before.organizationId },
          data: { status: 'ACTIVE', version: { increment: 1 } },
        });
      if (to === 'SUSPENDED')
        await tx.storefront.updateMany({
          where: { organizationId: before.organizationId },
          data: { status: 'SUSPENDED', version: { increment: 1 } },
        });
      const application = await tx.dealerApplication.findUniqueOrThrow({
        where: { id: before.id },
        include: applicationInclude,
      });
      await this.writeLifecycle(
        tx,
        application,
        userId,
        correlationId,
        `dealer.application.${input.action}`,
        before.status,
        input.reason,
      );
      return application;
    });
  }

  private next(
    status: Parameters<typeof transitionDealerStatus>[0],
    action: DealerAction,
    reason?: string,
  ) {
    try {
      return transitionDealerStatus(status, action, reason);
    } catch (error) {
      throw new ConflictException(error instanceof Error ? error.message : 'Invalid transition');
    }
  }

  private applicationData(input: CreateDealerApplication) {
    return {
      legalBusinessName: input.legalBusinessName,
      publicDealerName: input.publicDealerName,
      businessType: input.businessType,
      website: input.website ?? null,
      email: input.email,
      phone: input.phone,
      businessAddress: input.businessAddress,
      contactPerson: input.contactPerson,
      companyDescription: input.companyDescription,
      specialties: input.specialties,
      yearsInBusiness: input.yearsInBusiness,
      supportingDocuments: input.supportingDocuments,
    };
  }

  private verificationAction(action: DealerReviewInput['action']): DealerVerificationAction {
    return (
      {
        start_review: 'START_REVIEW',
        request_changes: 'REQUEST_CHANGES',
        approve: 'APPROVE',
        reject: 'REJECT',
        suspend: 'SUSPEND',
      } as const
    )[action];
  }

  private async writeLifecycle(
    tx: Prisma.TransactionClient,
    application: {
      id: string;
      organizationId: string;
      status: string;
      version: number;
      applicantUserId: string;
    },
    actorUserId: string,
    correlationId: string,
    eventType: string,
    beforeStatus?: string,
    reason?: string,
  ) {
    const event = await tx.outboxEvent.create({
      data: {
        organizationId: application.organizationId,
        aggregateType: 'DealerApplication',
        aggregateId: application.id,
        eventType,
        payload: {
          applicationId: application.id,
          organizationId: application.organizationId,
          applicantUserId: application.applicantUserId,
          status: application.status,
          ...(reason ? { reason } : {}),
        },
      },
    });
    await tx.auditLog.create({
      data: this.audit.entry({
        organizationId: application.organizationId,
        actorUserId,
        action: eventType,
        resourceType: 'DealerApplication',
        resourceId: application.id,
        correlationId,
        ...(beforeStatus ? { before: { status: beforeStatus } } : {}),
        after: { status: application.status, version: application.version },
        metadata: { sourceEventId: event.id },
      }),
    });
  }
}
