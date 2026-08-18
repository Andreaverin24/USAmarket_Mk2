import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@atlas/auth';
import { PrismaClient } from '@atlas/database';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { OrderService } from '../src/modules/orders/order.service.js';
import { SupportService } from '../src/modules/support/support.service.js';
import { TenantService } from '../src/modules/tenancy/tenant.service.js';
import {
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database.js';

describe('DecorFlavor P0 manual-invoice order flow', () => {
  let database: IntegrationDatabase;
  let db: PrismaClient;
  let orders: OrderService;
  let support: SupportService;
  let productId: string;
  let buyerId: string;
  let sellerId: string;
  let sellerOrganizationId: string;
  let adminId: string;

  beforeAll(async () => {
    database = await setupIntegrationDatabase();
    db = new PrismaClient({ datasources: { db: { url: database.url } } });
    const permissions = await Promise.all(
      [
        'orders:read',
        'orders:write',
        'orders:verify',
        'platform:admin',
        'support:read',
        'support:manage',
      ].map((code) => db.permission.create({ data: { code, description: code } })),
    );
    const [sellerOrganization, platformOrganization] = await Promise.all([
      db.organization.create({ data: { slug: 'p0-seller', name: 'P0 Seller', type: 'SELLER' } }),
      db.organization.create({
        data: { slug: 'p0-platform', name: 'P0 Platform', type: 'PLATFORM' },
      }),
    ]);
    sellerOrganizationId = sellerOrganization.id;
    await db.dealerProfile.create({
      data: {
        organizationId: sellerOrganization.id,
        status: 'APPROVED',
        publicDealerName: sellerOrganization.name,
        approvedAt: new Date(),
      },
    });
    const [sellerRole, adminRole] = await Promise.all([
      db.role.create({
        data: {
          code: 'p0-seller-owner',
          name: 'Seller owner',
          organizationId: sellerOrganization.id,
          permissions: {
            create: permissions
              .filter((permission) => ['orders:read', 'orders:write'].includes(permission.code))
              .map((permission) => ({ permissionId: permission.id })),
          },
        },
      }),
      db.role.create({
        data: {
          code: 'p0-platform-admin',
          name: 'Platform admin',
          organizationId: platformOrganization.id,
          permissions: {
            create: permissions
              .filter((permission) => permission.code === 'platform:admin')
              .map((permission) => ({ permissionId: permission.id })),
          },
        },
      }),
    ]);
    const passwordHash = await hashPassword('integration-password');
    const [buyer, seller, admin] = await Promise.all([
      db.user.create({ data: { email: 'buyer@p0.local', displayName: 'Buyer', passwordHash } }),
      db.user.create({ data: { email: 'seller@p0.local', displayName: 'Seller', passwordHash } }),
      db.user.create({ data: { email: 'admin@p0.local', displayName: 'Admin', passwordHash } }),
    ]);
    buyerId = buyer.id;
    sellerId = seller.id;
    adminId = admin.id;
    await Promise.all([
      db.organizationMember.create({
        data: { organizationId: sellerOrganization.id, userId: seller.id, roleId: sellerRole.id },
      }),
      db.organizationMember.create({
        data: { organizationId: platformOrganization.id, userId: admin.id, roleId: adminRole.id },
      }),
    ]);
    const category = await db.category.create({
      data: { slug: 'p0-furniture', name: 'P0 Furniture' },
    });
    const product = await db.product.create({
      data: {
        organizationId: sellerOrganization.id,
        categoryId: category.id,
        title: 'P0 Travertine Console',
        slug: 'p0-travertine-console',
        productType: 'Console',
        condition: 'EXCELLENT',
        priceMinor: 125_000,
        currency: 'USD',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        inventorySku: 'P0-CONSOLE-001',
        inventory: {
          create: {
            organizationId: sellerOrganization.id,
            quantityOnHand: 1,
            quantityAvailable: 1,
            status: 'AVAILABLE',
          },
        },
      },
    });
    productId = product.id;
    const tenants = new TenantService(db as never);
    const audit = new AuditService();
    orders = new OrderService(
      db as unknown as ConstructorParameters<typeof OrderService>[0],
      tenants,
      audit,
    );
    support = new SupportService(db as never, tenants, audit);
  });

  afterAll(async () => {
    await teardownIntegrationDatabase(database, db);
  });

  it('reserves, invoices outside the platform, confirms, and releases to fulfillment', async () => {
    const correlationId = randomUUID();
    const created = await orders.create(buyerId, { productId }, correlationId);
    expect(created.status).toBe('AWAITING_SELLER_INVOICE');
    await expect(orders.create(buyerId, { productId }, correlationId)).rejects.toMatchObject({
      status: 409,
    });
    expect(await db.product.findUniqueOrThrow({ where: { id: productId } })).toMatchObject({
      status: 'RESERVED',
    });

    const invoiced = await orders.issueInvoice(
      sellerId,
      sellerOrganizationId,
      created.id,
      {
        version: created.version,
        externalReference: 'SELLER-INV-1001',
        shippingMinor: '2500',
        dueAt: new Date(Date.now() + 86_400_000),
      },
      correlationId,
    );
    expect(invoiced).toMatchObject({
      status: 'INVOICE_SENT',
      shippingMinor: '2500',
      totalMinor: '127500',
      manualInvoice: { externalReference: 'SELLER-INV-1001', status: 'ISSUED' },
    });

    const reported = await orders.reportPayment(
      buyerId,
      created.id,
      { version: invoiced.version },
      correlationId,
    );
    expect(reported.status).toBe('PAYMENT_VERIFICATION_PENDING');
    await expect(
      orders.confirmPayment(sellerId, created.id, { version: reported.version }, correlationId),
    ).rejects.toMatchObject({
      status: 404,
    });

    const confirmed = await orders.confirmPayment(
      adminId,
      created.id,
      { version: reported.version },
      correlationId,
    );
    expect(confirmed).toMatchObject({
      status: 'PAYMENT_CONFIRMED',
      manualInvoice: { status: 'VERIFIED', verifiedByUserId: adminId },
    });
    await expect(
      orders.cancelByBuyer(buyerId, created.id, { version: confirmed.version }, correlationId),
    ).rejects.toThrow('Cannot cancel order from PAYMENT_CONFIRMED');

    const ready = await orders.markReady(
      sellerId,
      sellerOrganizationId,
      created.id,
      { version: confirmed.version },
      correlationId,
    );
    expect(ready.status).toBe('READY_FOR_FULFILLMENT');
    expect(ready.events.map((event) => event.action)).toEqual([
      'reserve-item',
      'issue-invoice',
      'report-payment',
      'confirm-payment',
      'mark-ready',
    ]);
    expect(await db.auditLog.count({ where: { resourceId: created.id } })).toBe(5);
    expect(await db.outboxEvent.count({ where: { aggregateId: created.id } })).toBe(5);
    expect(await db.notification.count()).toBe(11);

    const opened = await support.createBuyerCase(
      buyerId,
      {
        orderId: created.id,
        category: 'FULFILLMENT',
        subject: 'When will fulfillment start?',
        message: 'Please confirm the next fulfillment step for this object.',
      },
      correlationId,
    );
    expect(opened).toMatchObject({
      status: 'OPEN',
      events: [
        { action: 'opened', note: 'Please confirm the next fulfillment step for this object.' },
      ],
    });
    expect(opened.order).not.toHaveProperty('sellerOrganizationId');
    await expect(support.buyerCase(sellerId, opened.id)).rejects.toMatchObject({ status: 404 });
    await expect(support.adminCases(sellerId, {})).rejects.toMatchObject({ status: 404 });
    const reviewing = await support.updateCase(
      adminId,
      opened.id,
      { version: opened.version, action: 'start-review' },
      correlationId,
    );
    const resolved = await support.updateCase(
      adminId,
      opened.id,
      {
        version: reviewing.version,
        action: 'resolve',
        note: 'The seller has the order in its fulfillment preparation queue.',
      },
      correlationId,
    );
    expect(resolved).toMatchObject({ status: 'RESOLVED' });
    expect(resolved.events.map((event) => event.toStatus)).toEqual([
      'OPEN',
      'IN_REVIEW',
      'RESOLVED',
    ]);
    expect(await support.buyerCases(buyerId)).toHaveLength(1);
    expect(await db.auditLog.count({ where: { resourceId: opened.id } })).toBe(3);
    expect(await db.outboxEvent.count({ where: { aggregateId: opened.id } })).toBe(3);
    expect(await db.notification.count()).toBe(14);
  });
});
