import type { OrderStatus } from '@atlas/database';

export type OrderAction =
  | 'issue-invoice'
  | 'reissue-invoice'
  | 'report-payment'
  | 'confirm-payment'
  | 'reject-payment'
  | 'mark-ready'
  | 'cancel';

const transitions: Record<OrderAction, Partial<Record<OrderStatus, OrderStatus>>> = {
  'issue-invoice': { AWAITING_SELLER_INVOICE: 'INVOICE_SENT' },
  'reissue-invoice': { INVOICE_SENT: 'INVOICE_SENT' },
  'report-payment': { INVOICE_SENT: 'PAYMENT_VERIFICATION_PENDING' },
  'confirm-payment': { PAYMENT_VERIFICATION_PENDING: 'PAYMENT_CONFIRMED' },
  'reject-payment': { PAYMENT_VERIFICATION_PENDING: 'INVOICE_SENT' },
  'mark-ready': { PAYMENT_CONFIRMED: 'READY_FOR_FULFILLMENT' },
  cancel: {
    AWAITING_SELLER_INVOICE: 'CANCELLED',
    INVOICE_SENT: 'CANCELLED',
    PAYMENT_VERIFICATION_PENDING: 'CANCELLED',
  },
};

export function transitionOrderStatus(current: OrderStatus, action: OrderAction): OrderStatus {
  const next = transitions[action][current];
  if (!next) throw new Error(`Cannot ${action} order from ${current}`);
  return next;
}

export function canCancelOrder(current: OrderStatus) {
  return Boolean(transitions.cancel[current]);
}
