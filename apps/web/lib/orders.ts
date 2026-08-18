export interface ManualInvoice {
  externalReference: string;
  amountMinor: string;
  currency: string;
  dueAt: string;
  status: 'ISSUED' | 'BUYER_REPORTED' | 'VERIFIED' | 'REJECTED';
  issuedAt: string;
  buyerReportedAt: string | null;
  verifiedAt: string | null;
}

export interface MarketplaceOrder {
  id: string;
  buyerUserId: string;
  sellerOrganizationId: string;
  productId: string;
  productTitleSnapshot: string;
  productPriceMinor: string;
  shippingMinor: string;
  totalMinor: string;
  currency: string;
  status:
    | 'AWAITING_SELLER_INVOICE'
    | 'INVOICE_SENT'
    | 'PAYMENT_VERIFICATION_PENDING'
    | 'PAYMENT_CONFIRMED'
    | 'READY_FOR_FULFILLMENT'
    | 'CANCELLED';
  version: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string; slug: string };
  product: { id: string; title: string; slug: string };
  manualInvoice: ManualInvoice | null;
  events: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
    actor: { id: string; displayName: string } | null;
  }>;
}

export const orderStatusLabel: Record<MarketplaceOrder['status'], string> = {
  AWAITING_SELLER_INVOICE: 'Seller is preparing an external invoice',
  INVOICE_SENT: 'External invoice issued',
  PAYMENT_VERIFICATION_PENDING: 'Payment report awaiting admin confirmation',
  PAYMENT_CONFIRMED: 'Payment confirmed by DecorFlavor admin',
  READY_FOR_FULFILLMENT: 'Ready for fulfillment',
  CANCELLED: 'Cancelled',
};

export function formatMoney(minor: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
}
