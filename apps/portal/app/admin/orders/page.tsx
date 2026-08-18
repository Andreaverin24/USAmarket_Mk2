'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../../../lib/api';

type Attention = '' | 'OVERDUE_INVOICE' | 'PAYMENT_VERIFICATION';

interface Order {
  id: string;
  productTitleSnapshot: string;
  totalMinor: string;
  currency: string;
  status: string;
  version: number;
  buyer: { displayName: string; email: string };
  seller: { name: string };
  operational: { isInvoiceOverdue: boolean; requiresPaymentVerification: boolean };
  manualInvoice: {
    externalReference: string;
    amountMinor: string;
    currency: string;
    dueAt: string;
    status: string;
    buyerReportedAt: string | null;
  } | null;
}

const money = (minor: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
const label = (value: string) => value.replaceAll('_', ' ');

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState('Loading order operations…');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [attention, setAttention] = useState<Attention>('');

  async function load(filters = { query, status, attention }) {
    try {
      const params = new URLSearchParams();
      if (filters.query.trim()) params.set('query', filters.query.trim());
      if (filters.status) params.set('status', filters.status);
      if (filters.attention) params.set('attention', filters.attention);
      const suffix = params.size ? `?${params.toString()}` : '';
      setOrders(await request<Order[]>(`/admin/orders${suffix}`));
      setState('');
    } catch {
      setState('Sign in as a DecorFlavor platform administrator to view order operations.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(order: Order, endpoint: 'confirm-payment' | 'reject-payment') {
    try {
      await request(`/admin/orders/${order.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ version: order.version }),
      });
      await load();
    } catch {
      setState('The decision could not be saved. Refresh the queue and try again.');
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  return (
    <main className="portal-page order-operations-page">
      <header>
        <div>
          <p className="eyebrow">Platform operations · Manual invoice</p>
          <h1>Order operations</h1>
        </div>
        <div className="actions">
          <Link href="/admin/support">Buyer support</Link>
          <Link href="/admin/dealers">Dealer operations</Link>
          <Link href="/orders">Seller orders</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/login">Switch account</Link>
        </div>
      </header>
      <p className="order-process-note">
        A buyer report is not payment confirmation. Only a platform administrator can verify it
        after checking the seller’s external process. DecorFlavor stores no payment data and
        performs no money movement.
      </p>
      <form className="operations-form" onSubmit={applyFilters}>
        <label>
          Search order, buyer, or external invoice reference
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="AWAITING_SELLER_INVOICE">Awaiting seller invoice</option>
            <option value="INVOICE_SENT">Invoice sent</option>
            <option value="PAYMENT_VERIFICATION_PENDING">Payment verification pending</option>
            <option value="PAYMENT_CONFIRMED">Payment confirmed</option>
            <option value="READY_FOR_FULFILLMENT">Ready for fulfillment</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label>
          Needs attention
          <select
            value={attention}
            onChange={(event) => setAttention(event.target.value as Attention)}
          >
            <option value="">All orders</option>
            <option value="PAYMENT_VERIFICATION">Payment verification</option>
            <option value="OVERDUE_INVOICE">Overdue external invoice</option>
          </select>
        </label>
        <div className="operations-form-actions">
          <button>Apply filters</button>
        </div>
      </form>
      {state ? (
        <p className="notice" role="alert">
          {state}
        </p>
      ) : null}
      {!state && !orders.length ? (
        <p className="notice">No orders match this operational view.</p>
      ) : null}
      <section className="operation-list">
        {orders.map((order) => (
          <article className="operation-card" key={order.id}>
            <p className="eyebrow">{label(order.status)}</p>
            <h2>{order.productTitleSnapshot}</h2>
            <p>Seller · {order.seller.name}</p>
            <p>
              Buyer · {order.buyer.displayName} ({order.buyer.email})
            </p>
            <p>Total · {money(order.totalMinor, order.currency)}</p>
            {order.operational.requiresPaymentVerification ? (
              <p>
                <strong>Attention: manual payment verification is required.</strong>
              </p>
            ) : null}
            {order.operational.isInvoiceOverdue ? (
              <p>
                <strong>Attention: the external invoice is past its due date.</strong>
              </p>
            ) : null}
            {order.manualInvoice ? (
              <p>
                External reference {order.manualInvoice.externalReference} ·{' '}
                {money(order.manualInvoice.amountMinor, order.manualInvoice.currency)} · due{' '}
                {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                  new Date(order.manualInvoice.dueAt),
                )}
              </p>
            ) : null}
            {order.status === 'PAYMENT_VERIFICATION_PENDING' ? (
              <div className="actions">
                <button onClick={() => void decide(order, 'confirm-payment')}>
                  Confirm payment
                </button>
                <button
                  className="outline-button"
                  onClick={() => void decide(order, 'reject-payment')}
                >
                  Reject report
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
