import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@atlas/database';
import { hashPassword } from '@atlas/auth';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import {
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database.js';

describe('tenant isolation with PostgreSQL', () => {
  let database: IntegrationDatabase;
  let db: PrismaClient;
  let sellerUserId: string;
  let sellerOrgId: string;
  let otherOrgId: string;
  beforeAll(async () => {
    database = await setupIntegrationDatabase();
    db = new PrismaClient({ datasources: { db: { url: database.url } } });
    const permission = await db.permission.create({
      data: { code: 'organization:members:read', description: 'read' },
    });
    const sellerOrg = await db.organization.create({
      data: { slug: 'seller-a', name: 'Seller A', type: 'SELLER' },
    });
    sellerOrgId = sellerOrg.id;
    const otherOrg = await db.organization.create({
      data: { slug: 'seller-b', name: 'Seller B', type: 'SELLER' },
    });
    otherOrgId = otherOrg.id;
    const role = await db.role.create({
      data: {
        code: 'seller-a-owner',
        name: 'Owner',
        organizationId: sellerOrg.id,
        permissions: { create: { permissionId: permission.id } },
      },
    });
    const user = await db.user.create({
      data: {
        email: 'seller-a@test.local',
        displayName: 'Seller A',
        passwordHash: await hashPassword('integration-password'),
      },
    });
    sellerUserId = user.id;
    await db.organizationMember.create({
      data: { organizationId: sellerOrg.id, userId: user.id, roleId: role.id },
    });
  });
  afterAll(async () => {
    await teardownIntegrationDatabase(database, db);
  });
  it('allows the member tenant', async () => {
    const service = new TenantService(db as any);
    await expect(
      service.resolve(sellerUserId, sellerOrgId, 'organization:members:read'),
    ).resolves.toMatchObject({ organizationId: sellerOrgId });
  });
  it('denies a foreign tenant without revealing it', async () => {
    const service = new TenantService(db as any);
    await expect(
      service.resolve(sellerUserId, otherOrgId, 'organization:members:read'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
