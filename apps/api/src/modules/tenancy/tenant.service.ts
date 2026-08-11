import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service.js';

@Injectable()
export class TenantService {
  constructor(private readonly db: DatabaseService) {}
  async resolve(userId: string, organizationId: string, requiredPermission: string) {
    const membership = await this.db.organizationMember.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
      select: {
        organizationId: true,
        role: { select: { permissions: { select: { permission: { select: { code: true } } } } } },
      },
    });
    if (!membership) {
      const platformMembership = await this.db.organizationMember.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          organization: { type: 'PLATFORM', status: 'ACTIVE' },
          role: {
            permissions: {
              some: { permission: { code: { in: ['platform:admin', requiredPermission] } } },
            },
          },
        },
        select: {
          role: { select: { permissions: { select: { permission: { select: { code: true } } } } } },
        },
      });
      const organization = platformMembership
        ? await this.db.organization.findFirst({
            where: { id: organizationId, status: 'ACTIVE' },
            select: { id: true },
          })
        : null;
      if (!organization) throw new NotFoundException('Organization not found');
      return {
        userId,
        organizationId: organization.id,
        permissions: platformMembership!.role.permissions.map((grant) => grant.permission.code),
      };
    }
    const permissions = membership.role.permissions.map((grant) => grant.permission.code);
    if (!permissions.includes(requiredPermission) && !permissions.includes('platform:admin'))
      throw new NotFoundException('Organization not found');
    return { userId, organizationId: membership.organizationId, permissions };
  }
  async requirePlatformPermission(userId: string, requiredPermission: string) {
    const membership = await this.db.organizationMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { type: 'PLATFORM', status: 'ACTIVE' },
        role: {
          permissions: {
            some: { permission: { code: { in: ['platform:admin', requiredPermission] } } },
          },
        },
      },
      select: {
        organizationId: true,
        role: { select: { permissions: { select: { permission: { select: { code: true } } } } } },
      },
    });
    if (!membership) throw new NotFoundException('Platform resource not found');
    return {
      userId,
      organizationId: membership.organizationId,
      permissions: membership.role.permissions.map((grant) => grant.permission.code),
    };
  }
  async members(userId: string, organizationId: string) {
    const tenant = await this.resolve(userId, organizationId, 'organization:members:read');
    return this.db.organizationMember.findMany({
      where: { organizationId: tenant.organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        user: { select: { id: true, email: true, displayName: true } },
        role: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
