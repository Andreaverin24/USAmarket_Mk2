import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service.js';

describe('TenantService', () => {
  it('fails closed when membership belongs to another organization', async () => {
    const db = { organizationMember: { findFirst: vi.fn().mockResolvedValue(null) } } as any;
    await expect(
      new TenantService(db).resolve('user-a', 'org-b', 'organization:members:read'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-a', organizationId: 'org-b' }),
      }),
    );
  });
  it('returns only server-derived context after permission validation', async () => {
    const db = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({
          organizationId: 'org-a',
          role: { permissions: [{ permission: { code: 'organization:members:read' } }] },
        }),
      },
    } as any;
    await expect(
      new TenantService(db).resolve('user-a', 'org-a', 'organization:members:read'),
    ).resolves.toEqual({
      userId: 'user-a',
      organizationId: 'org-a',
      permissions: ['organization:members:read'],
    });
  });
});
