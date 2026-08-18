import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@atlas/database';
import { DatabaseService } from '../../common/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TenantService } from '../tenancy/tenant.service.js';
import type {
  CancelOrderInput,
  CreateOrderInput,
  IssueInvoiceInput,
  OrderQueueQuery,
  OrderVersionInput,
} from './order.schemas.js';
import { orderInclude, presentOrder, type OrderWithDetails } from './order.presenter.js';
import { transitionOrderStatus, type OrderAction } from './order-state-machine.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class OrderService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, input: CreateOrderInput, correlationId: string) {
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: input.productId,
          status: 'PUBLISHED',
          quantity: 1,
          organization: { status: 'ACTIVE', dealerProfile: { status: 'APPROVED' } },
          inventory: { status: 'AVAILABLE', quantityAvailable: 1 },
        },
        include: { inventory: true },
      });
      if (!product?.inventory)
        throw new ConflictException('This unique item is no longer available to reserve');

      const reserved = await tx.product.updateMany({
        where: { id: product.id, status: 'PUBLISHED', version: product.version },
        data: { status: 'RESERVED', version: { increment: 1 } },
      });
      if (!reserved.count) throw new ConflictException('Product version or availability changed');

      const inventoryReserved = await tx.inventoryItem.updateMany({
        where: {
          id: product.inventory.id,
          version: product.inventory.version,
          status: 'AVAILABLE',
          quantityAvailable: 1,
        },
        data: {
          status: 'UNAVAILABLE',
          quantityAvailable: 0,
          version: { increment: 1 },
        },
      });
      if (!inventoryReserved.count) throw new ConflictException('Product inventory changed');

      const order = await tx.order.create({
        data: {
          buyerUserId: userId,
          sellerOrganizationId: product.organizationId,
          productId: product.id,
          productTitleSnapshot: product.title,
          productPriceMinor: product.priceMinor,
          shippingMinor: 0,
          totalMinor: product.priceMinor,
          currency: product.currency,
          status: 'AWAITING_SELLER_INVOICE',
        },
      });
      await this.recordTransition(tx, {
        order,
        actorUserId: userId,
        action: 'reserve-item',
        toStatus: order.status,
        correlationId,
      });
      return this.presentById(tx, order.id);
    });
  }

  async buyerOrders(userId: string) {
    const orders = await this.db.order.findMany({
      where: { buyerUserId: userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(presentOrder);
  }

  async buyerOrder(userId: string, orderId: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, buyerUserId: userId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return presentOrder(order);
  }

  async sellerOrders(userId: string, organizationId: string, query: OrderQueueQuery = {}) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'orders:read');
    const orders = await this.db.order.findMany({
      where: { sellerOrganizationId: tenant.organizationId, ...this.queueWhere(query) },
      include: orderInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return orders.map(presentOrder);
  }

  async sellerOrder(userId: string, organizationId: string, orderId: string) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'orders:read');
    const order = await this.db.order.findFirst({
      where: { id: orderId, sellerOrganizationId: tenant.organizationId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return presentOrder(order);
  }

  async adminOrders(userId: string, query: OrderQueueQuery = {}) {
    await this.tenants.requirePlatformPermission(userId, 'orders:verify');
    const orders = await this.db.order.findMany({
      where: this.queueWhere(query),
      include: orderInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return orders.map(presentOrder);
  }

  async adminOrder(userId: string, orderId: string) {
    await this.tenants.requirePlatformPermission(userId, 'orders:verify');
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!order) throw new NotFoundException('Order not found');
    return presentOrder(order);
  }

  async issueInvoice(
    userId: string,
    organizationId: string,
    orderId: string,
    input: IssueInvoiceInput,
    correlationId: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'orders:write');
    return this.db.$transaction(async (tx) => {
      const before = await this.requireSellerOrder(tx, orderId, tenant.organizationId);
      const action: OrderAction =
        before.status === 'AWAITING_SELLER_INVOICE' ? 'issue-invoice' : 'reissue-invoice';
      if (
        before.status !== 'AWAITING_SELLER_INVOICE' &&
        !(before.status === 'INVOICE_SENT' && before.manualInvoice?.status === 'REJECTED')
      )
        throw new ConflictException('Order is not ready for an external invoice');
      const toStatus = transitionOrderStatus(before.status, action);
      const shippingMinor = BigInt(input.shippingMinor);
      const totalMinor = before.productPriceMinor + shippingMinor;
      const updated = await tx.order.updateMany({
        where: { id: before.id, version: input.version, status: before.status },
        data: {
          status: toStatus,
          shippingMinor,
          totalMinor,
          version: { increment: 1 },
        },
      });
      if (!updated.count) throw new ConflictException('Order version or state changed');

      if (before.manualInvoice) {
        await tx.manualInvoice.update({
          where: { orderId: before.id },
          data: {
            externalReference: input.externalReference,
            amountMinor: totalMinor,
            currency: before.currency,
            dueAt: input.dueAt,
            status: 'ISSUED',
            issuedAt: new Date(),
            buyerReportedAt: null,
            verifiedAt: null,
            verifiedByUserId: null,
          },
        });
      } else {
        await tx.manualInvoice.create({
          data: {
            orderId: before.id,
            externalReference: input.externalReference,
            amountMinor: totalMinor,
            currency: before.currency,
            dueAt: input.dueAt,
            status: 'ISSUED',
          },
        });
      }
      await this.recordTransition(tx, {
        order: before,
        actorUserId: userId,
        action,
        fromStatus: before.status,
        toStatus,
        correlationId,
      });
      return this.presentById(tx, before.id);
    });
  }

  async reportPayment(
    userId: string,
    orderId: string,
    input: OrderVersionInput,
    correlationId: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await this.requireBuyerOrder(tx, orderId, userId);
      const toStatus = transitionOrderStatus(before.status, 'report-payment');
      const reported = await tx.manualInvoice.updateMany({
        where: { orderId: before.id, status: 'ISSUED' },
        data: { status: 'BUYER_REPORTED', buyerReportedAt: new Date() },
      });
      if (!reported.count) throw new ConflictException('External invoice state changed');
      const updated = await tx.order.updateMany({
        where: { id: before.id, version: input.version, status: before.status },
        data: { status: toStatus, version: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('Order version or state changed');
      await this.recordTransition(tx, {
        order: before,
        actorUserId: userId,
        action: 'report-payment',
        fromStatus: before.status,
        toStatus,
        correlationId,
      });
      return this.presentById(tx, before.id);
    });
  }

  async confirmPayment(
    userId: string,
    orderId: string,
    input: OrderVersionInput,
    correlationId: string,
  ) {
    // Confirmation is deliberately restricted to a full platform administrator;
    // a buyer report remains only a report until this operation is completed.
    await this.tenants.requirePlatformPermission(userId, 'platform:admin');
    return this.verifyPayment(userId, orderId, input, correlationId, 'confirm-payment');
  }

  async rejectPayment(
    userId: string,
    orderId: string,
    input: OrderVersionInput,
    correlationId: string,
  ) {
    await this.tenants.requirePlatformPermission(userId, 'platform:admin');
    return this.verifyPayment(userId, orderId, input, correlationId, 'reject-payment');
  }

  async markReady(
    userId: string,
    organizationId: string,
    orderId: string,
    input: OrderVersionInput,
    correlationId: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'orders:write');
    return this.db.$transaction(async (tx) => {
      const before = await this.requireSellerOrder(tx, orderId, tenant.organizationId);
      const toStatus = transitionOrderStatus(before.status, 'mark-ready');
      const updated = await tx.order.updateMany({
        where: { id: before.id, version: input.version, status: before.status },
        data: { status: toStatus, version: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('Order version or state changed');
      await this.recordTransition(tx, {
        order: before,
        actorUserId: userId,
        action: 'mark-ready',
        fromStatus: before.status,
        toStatus,
        correlationId,
      });
      return this.presentById(tx, before.id);
    });
  }

  async cancelByBuyer(
    userId: string,
    orderId: string,
    input: CancelOrderInput,
    correlationId: string,
  ) {
    return this.cancel(userId, orderId, input, correlationId, { kind: 'buyer', userId });
  }

  async cancelBySeller(
    userId: string,
    organizationId: string,
    orderId: string,
    input: CancelOrderInput,
    correlationId: string,
  ) {
    const tenant = await this.tenants.resolve(userId, organizationId, 'orders:write');
    return this.cancel(userId, orderId, input, correlationId, {
      kind: 'seller',
      organizationId: tenant.organizationId,
    });
  }

  async cancelByAdmin(
    userId: string,
    orderId: string,
    input: CancelOrderInput,
    correlationId: string,
  ) {
    await this.tenants.requirePlatformPermission(userId, 'platform:admin');
    return this.cancel(userId, orderId, input, correlationId, { kind: 'admin' });
  }

  private async verifyPayment(
    userId: string,
    orderId: string,
    input: OrderVersionInput,
    correlationId: string,
    action: Extract<OrderAction, 'confirm-payment' | 'reject-payment'>,
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await this.requireOrder(tx, orderId);
      const toStatus = transitionOrderStatus(before.status, action);
      const invoiceStatus = action === 'confirm-payment' ? 'VERIFIED' : 'REJECTED';
      const invoiceUpdated = await tx.manualInvoice.updateMany({
        where: { orderId: before.id, status: 'BUYER_REPORTED' },
        data: {
          status: invoiceStatus,
          verifiedAt: new Date(),
          verifiedByUserId: userId,
        },
      });
      if (!invoiceUpdated.count) throw new ConflictException('External invoice state changed');
      const updated = await tx.order.updateMany({
        where: { id: before.id, version: input.version, status: before.status },
        data: { status: toStatus, version: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('Order version or state changed');
      await this.recordTransition(tx, {
        order: before,
        actorUserId: userId,
        action,
        fromStatus: before.status,
        toStatus,
        correlationId,
      });
      return this.presentById(tx, before.id);
    });
  }

  private async cancel(
    userId: string,
    orderId: string,
    input: CancelOrderInput,
    correlationId: string,
    actor:
      | { kind: 'buyer'; userId: string }
      | { kind: 'seller'; organizationId: string }
      | { kind: 'admin' },
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await this.requireOrder(tx, orderId);
      if (actor.kind === 'buyer' && before.buyerUserId !== actor.userId)
        throw new NotFoundException('Order not found');
      if (actor.kind === 'seller' && before.sellerOrganizationId !== actor.organizationId)
        throw new NotFoundException('Order not found');
      const toStatus = transitionOrderStatus(before.status, 'cancel');
      const updated = await tx.order.updateMany({
        where: { id: before.id, version: input.version, status: before.status },
        data: {
          status: toStatus,
          cancelledAt: new Date(),
          ...(input.reason ? { cancellationReason: input.reason } : {}),
          version: { increment: 1 },
        },
      });
      if (!updated.count) throw new ConflictException('Order version or state changed');
      const productReleased = await tx.product.updateMany({
        where: { id: before.productId, status: 'RESERVED' },
        data: { status: 'PUBLISHED', version: { increment: 1 } },
      });
      if (!productReleased.count) throw new ConflictException('Reserved product state changed');
      const inventoryReleased = await tx.inventoryItem.updateMany({
        where: { productId: before.productId, status: 'UNAVAILABLE', quantityAvailable: 0 },
        data: { status: 'AVAILABLE', quantityAvailable: 1, version: { increment: 1 } },
      });
      if (!inventoryReleased.count) throw new ConflictException('Reserved inventory state changed');
      await this.recordTransition(tx, {
        order: before,
        actorUserId: userId,
        action: 'cancel',
        fromStatus: before.status,
        toStatus,
        note: input.reason,
        correlationId,
      });
      return this.presentById(tx, before.id);
    });
  }

  private async requireOrder(tx: Tx, orderId: string) {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async requireBuyerOrder(tx: Tx, orderId: string, userId: string) {
    const order = await tx.order.findFirst({
      where: { id: orderId, buyerUserId: userId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async requireSellerOrder(tx: Tx, orderId: string, organizationId: string) {
    const order = await tx.order.findFirst({
      where: { id: orderId, sellerOrganizationId: organizationId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async presentById(tx: Tx, orderId: string) {
    return presentOrder(await this.requireOrder(tx, orderId));
  }

  private queueWhere(query: OrderQueueQuery): Prisma.OrderWhereInput {
    const conditions: Prisma.OrderWhereInput[] = [];
    if (query.status) conditions.push({ status: query.status });
    if (query.query) {
      conditions.push({
        OR: [
          { productTitleSnapshot: { contains: query.query, mode: 'insensitive' } },
          { buyer: { email: { contains: query.query, mode: 'insensitive' } } },
          { buyer: { displayName: { contains: query.query, mode: 'insensitive' } } },
          {
            manualInvoice: {
              is: { externalReference: { contains: query.query, mode: 'insensitive' } },
            },
          },
        ],
      });
    }
    if (query.attention === 'OVERDUE_INVOICE') {
      conditions.push({
        status: 'INVOICE_SENT',
        manualInvoice: { is: { status: 'ISSUED', dueAt: { lt: new Date() } } },
      });
    }
    if (query.attention === 'PAYMENT_VERIFICATION')
      conditions.push({ status: 'PAYMENT_VERIFICATION_PENDING' });
    return conditions.length ? { AND: conditions } : {};
  }

  private async recordTransition(
    tx: Tx,
    input: {
      order: Pick<
        OrderWithDetails,
        'id' | 'buyerUserId' | 'sellerOrganizationId' | 'productTitleSnapshot'
      >;
      actorUserId: string;
      action: string;
      fromStatus?: OrderStatus;
      toStatus: OrderStatus;
      note?: string | undefined;
      correlationId: string;
    },
  ) {
    await tx.orderEvent.create({
      data: {
        orderId: input.order.id,
        actorUserId: input.actorUserId,
        action: input.action,
        ...(input.fromStatus ? { fromStatus: input.fromStatus } : {}),
        toStatus: input.toStatus,
        ...(input.note ? { note: input.note } : {}),
      },
    });
    await tx.auditLog.create({
      data: this.audit.entry({
        organizationId: input.order.sellerOrganizationId,
        actorUserId: input.actorUserId,
        action: `order.${input.action}`,
        resourceType: 'Order',
        resourceId: input.order.id,
        correlationId: input.correlationId,
        ...(input.fromStatus ? { before: { status: input.fromStatus } } : {}),
        after: { status: input.toStatus },
        ...(input.note ? { metadata: { cancellationReason: input.note } } : {}),
      }),
    });
    const outbox = await tx.outboxEvent.create({
      data: {
        organizationId: input.order.sellerOrganizationId,
        aggregateType: 'Order',
        aggregateId: input.order.id,
        eventType: `order.${input.action}`,
        payload: { orderId: input.order.id, status: input.toStatus },
      },
    });
    await this.createOperationalNotifications(tx, {
      sourceEventId: outbox.id,
      order: input.order,
      action: input.action,
      status: input.toStatus,
    });
  }

  private async createOperationalNotifications(
    tx: Tx,
    input: {
      sourceEventId: string;
      order: Pick<
        OrderWithDetails,
        'id' | 'buyerUserId' | 'sellerOrganizationId' | 'productTitleSnapshot'
      >;
      action: string;
      status: OrderStatus;
    },
  ) {
    const sellerMembers = await tx.organizationMember.findMany({
      where: {
        organizationId: input.order.sellerOrganizationId,
        status: 'ACTIVE',
        role: {
          permissions: {
            some: {
              permission: { code: { in: ['orders:read', 'orders:write', 'platform:admin'] } },
            },
          },
        },
      },
      select: { userId: true },
    });
    const platformMembers =
      input.action === 'report-payment'
        ? await tx.organizationMember.findMany({
            where: {
              status: 'ACTIVE',
              organization: { type: 'PLATFORM', status: 'ACTIVE' },
              role: {
                permissions: {
                  some: { permission: { code: { in: ['orders:verify', 'platform:admin'] } } },
                },
              },
            },
            select: { userId: true },
          })
        : [];
    const copy = this.orderNotificationCopy(input.action, input.order.productTitleSnapshot);
    const recipients = new Map<string, { subject: string; body: string }>();
    recipients.set(input.order.buyerUserId, copy.buyer);
    for (const member of sellerMembers)
      if (!recipients.has(member.userId)) recipients.set(member.userId, copy.seller);
    for (const member of platformMembers)
      if (!recipients.has(member.userId)) recipients.set(member.userId, copy.platform);
    const deliveredAt = new Date();
    await tx.notification.createMany({
      data: [...recipients.entries()].map(([recipientUserId, notification]) => ({
        organizationId: input.order.sellerOrganizationId,
        recipientUserId,
        sourceEventId: input.sourceEventId,
        channel: 'IN_APP' as const,
        type: `order.${input.action}`,
        subject: notification.subject,
        body: notification.body,
        payload: { orderId: input.order.id, status: input.status },
        status: 'DELIVERED' as const,
        deliveredAt,
      })),
    });
  }

  private orderNotificationCopy(action: string, productTitle: string) {
    const common = `${productTitle}. `;
    switch (action) {
      case 'reserve-item':
        return {
          buyer: {
            subject: 'Reservation created',
            body: `${common}The seller will issue an invoice outside DecorFlavor.`,
          },
          seller: {
            subject: 'New reservation needs an invoice',
            body: `${common}Issue the customer invoice outside DecorFlavor, then record its reference and due date.`,
          },
          platform: { subject: 'New reservation', body: common },
        };
      case 'issue-invoice':
      case 'reissue-invoice':
        return {
          buyer: {
            subject: 'External invoice information is ready',
            body: `${common}Review the seller's invoice outside DecorFlavor, then report payment here when applicable.`,
          },
          seller: {
            subject: 'External invoice recorded',
            body: `${common}The buyer can now report payment after using your external process.`,
          },
          platform: { subject: 'Order invoice updated', body: common },
        };
      case 'report-payment':
        return {
          buyer: {
            subject: 'Payment report recorded',
            body: `${common}DecorFlavor has recorded your report; a platform administrator must verify it manually.`,
          },
          seller: {
            subject: 'Buyer reported payment',
            body: `${common}The report is awaiting platform verification.`,
          },
          platform: {
            subject: 'Payment verification required',
            body: `${common}A buyer payment report requires manual platform verification.`,
          },
        };
      case 'confirm-payment':
        return {
          buyer: {
            subject: 'Payment report verified',
            body: `${common}The order is released for seller fulfillment preparation.`,
          },
          seller: {
            subject: 'Payment report verified',
            body: `${common}You can now mark this order ready for fulfillment.`,
          },
          platform: { subject: 'Payment report verified', body: common },
        };
      case 'reject-payment':
        return {
          buyer: {
            subject: 'Payment report needs attention',
            body: `${common}The report was not verified. Review the seller's external invoice process before reporting again.`,
          },
          seller: {
            subject: 'Payment report was not verified',
            body: `${common}The external invoice remains open for review.`,
          },
          platform: { subject: 'Payment report rejected', body: common },
        };
      case 'mark-ready':
        return {
          buyer: {
            subject: 'Order is ready for fulfillment',
            body: `${common}The seller has marked the order ready for the next fulfillment step.`,
          },
          seller: { subject: 'Order marked ready', body: common },
          platform: { subject: 'Order ready for fulfillment', body: common },
        };
      case 'cancel':
        return {
          buyer: {
            subject: 'Reservation cancelled',
            body: `${common}The object has been released back to the catalog.`,
          },
          seller: {
            subject: 'Reservation cancelled',
            body: `${common}The object has been released back to the catalog.`,
          },
          platform: { subject: 'Reservation cancelled', body: common },
        };
      default:
        return {
          buyer: { subject: 'Order updated', body: common },
          seller: { subject: 'Order updated', body: common },
          platform: { subject: 'Order updated', body: common },
        };
    }
  }
}
