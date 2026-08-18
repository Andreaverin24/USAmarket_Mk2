'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, clientRequest } from '../../../../lib/client-api';
import { formatMoney, orderStatusLabel, type MarketplaceOrder } from '../../../../lib/orders';

export default function BuyerOrderPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<MarketplaceOrder>();
  const [state, setState] = useState('Loading reservation…');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const current = await clientRequest<MarketplaceOrder>(`/me/orders/${params.orderId}`);
      setOrder(current);
      setState('');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.replace(
          `/login?returnTo=${encodeURIComponent(`/account/orders/${params.orderId}`)}`,
        );
        return;
      }
      setState('Reservation not found or temporarily unavailable.');
    }
  }
  useEffect(() => {
    void load();
  }, [params.orderId]);

  async function reportPayment() {
    if (!order) return;
    setBusy(true);
    setState('');
    try {
      const current = await clientRequest<MarketplaceOrder>(
        `/me/orders/${order.id}/report-payment`,
        {
          method: 'POST',
          body: JSON.stringify({ version: order.version }),
        },
      );
      setOrder(current);
    } catch {
      setState('Payment report could not be recorded. Refresh and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!order || !window.confirm('Cancel this reservation and release the object?')) return;
    setBusy(true);
    try {
      const current = await clientRequest<MarketplaceOrder>(`/me/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ version: order.version, reason: 'Cancelled by buyer' }),
      });
      setOrder(current);
    } catch {
      setState('This reservation could not be cancelled. Refresh and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!order)
    return (
      <main className="orders-page">
        <p className="state">{state}</p>
      </main>
    );
  const canCancel = [
    'AWAITING_SELLER_INVOICE',
    'INVOICE_SENT',
    'PAYMENT_VERIFICATION_PENDING',
  ].includes(order.status);
  return (
    <main className="orders-page order-detail-page">
      <Link href="/account/orders">← Your reservations</Link>
      <p className="eyebrow">Reservation status</p>
      <h1>{order.productTitleSnapshot}</h1>
      <p className="order-status">{orderStatusLabel[order.status]}</p>
      <section className="order-summary">
        <p>Object · {formatMoney(order.productPriceMinor, order.currency)}</p>
        <p>Shipping · {formatMoney(order.shippingMinor, order.currency)}</p>
        <p>
          <strong>Total · {formatMoney(order.totalMinor, order.currency)}</strong>
        </p>
        <p>Seller · {order.seller.name}</p>
      </section>
      {order.manualInvoice ? (
        <section className="invoice-card">
          <p className="eyebrow">External seller invoice</p>
          <h2>Reference {order.manualInvoice.externalReference}</h2>
          <p>
            Amount due ·{' '}
            {formatMoney(order.manualInvoice.amountMinor, order.manualInvoice.currency)}
          </p>
          <p>
            Due ·{' '}
            {new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(
              new Date(order.manualInvoice.dueAt),
            )}
          </p>
          <p>
            The invoice itself is exchanged outside DecorFlavor. Do not enter payment details here.
          </p>
          {order.status === 'INVOICE_SENT' ? (
            <button disabled={busy} onClick={() => void reportPayment()}>
              {busy ? 'Recording…' : 'I have paid this external invoice'}
            </button>
          ) : null}
        </section>
      ) : (
        <section className="invoice-card">
          <p>The seller has been notified and will send an invoice outside DecorFlavor.</p>
        </section>
      )}
      {canCancel ? (
        <button className="secondary-button" disabled={busy} onClick={() => void cancel()}>
          Cancel reservation
        </button>
      ) : null}
      <Link href={`/account/support?orderId=${order.id}`}>Need help with this order?</Link>
      {state ? (
        <p className="order-error" role="alert">
          {state}
        </p>
      ) : null}
    </main>
  );
}
