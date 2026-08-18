import type { Prisma } from '@atlas/database';

export const orderInclude = {
  buyer: { select: { id: true, displayName: true, email: true } },
  seller: { select: { id: true, name: true, slug: true } },
  product: { select: { id: true, title: true, slug: true } },
  manualInvoice: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: { id: true, displayName: true } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function presentOrder(order: OrderWithDetails) {
  const now = new Date();
  const isInvoiceOverdue =
    order.status === 'INVOICE_SENT' &&
    order.manualInvoice?.status === 'ISSUED' &&
    order.manualInvoice.dueAt < now;
  return {
    ...order,
    productPriceMinor: order.productPriceMinor.toString(),
    shippingMinor: order.shippingMinor.toString(),
    totalMinor: order.totalMinor.toString(),
    manualInvoice: order.manualInvoice
      ? {
          ...order.manualInvoice,
          amountMinor: order.manualInvoice.amountMinor.toString(),
        }
      : null,
    operational: {
      isInvoiceOverdue,
      requiresPaymentVerification: order.status === 'PAYMENT_VERIFICATION_PENDING',
    },
  };
}
