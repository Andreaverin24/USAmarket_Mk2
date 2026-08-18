import { describe, expect, it } from 'vitest';
import { canCancelOrder, transitionOrderStatus } from './order-state-machine.js';

describe('manual-invoice order state machine', () => {
  it('allows the complete P0 happy path', () => {
    const invoiced = transitionOrderStatus('AWAITING_SELLER_INVOICE', 'issue-invoice');
    const reported = transitionOrderStatus(invoiced, 'report-payment');
    const confirmed = transitionOrderStatus(reported, 'confirm-payment');

    expect(transitionOrderStatus(confirmed, 'mark-ready')).toBe('READY_FOR_FULFILLMENT');
  });

  it('returns a rejected buyer report to the seller invoice state', () => {
    expect(transitionOrderStatus('PAYMENT_VERIFICATION_PENDING', 'reject-payment')).toBe(
      'INVOICE_SENT',
    );
    expect(transitionOrderStatus('INVOICE_SENT', 'reissue-invoice')).toBe('INVOICE_SENT');
  });

  it('only permits cancellation before payment confirmation', () => {
    expect(canCancelOrder('AWAITING_SELLER_INVOICE')).toBe(true);
    expect(canCancelOrder('PAYMENT_VERIFICATION_PENDING')).toBe(true);
    expect(canCancelOrder('PAYMENT_CONFIRMED')).toBe(false);
    expect(() => transitionOrderStatus('PAYMENT_CONFIRMED', 'cancel')).toThrow(
      'Cannot cancel order from PAYMENT_CONFIRMED',
    );
  });

  it('rejects an out-of-order buyer payment report', () => {
    expect(() => transitionOrderStatus('AWAITING_SELLER_INVOICE', 'report-payment')).toThrow(
      'Cannot report-payment order from AWAITING_SELLER_INVOICE',
    );
  });
});
