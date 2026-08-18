'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { request } from '../../lib/api';

interface Membership {
  organization: { id: string; slug: string; name: string };
}
interface Order {
  id: string;
  productTitleSnapshot: string;
  productPriceMinor: string;
  shippingMinor: string;
  totalMinor: string;
  currency: string;
  status: string;
  version: number;
  buyer: { displayName: string; email: string };
  manualInvoice: {
    externalReference: string;
    amountMinor: string;
    currency: string;
    dueAt: string;
    status: string;
  } | null;
  operational: { isInvoiceOverdue: boolean; requiresPaymentVerification: boolean };
}

const money = (minor: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
const dueDefault = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16);

export default function SellerOrdersPage() {
  const [organization, setOrganization] = useState<Membership['organization']>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState('Loading seller orders…');
  const [drafts, setDrafts] = useState<
    Record<string, { reference: string; shipping: string; dueAt: string }>
  >({});

  async function load() {
    try {
      const me = await request<{ memberships: Membership[] }>('/auth/me');
      const selected =
        me.memberships.find((entry) => entry.organization.slug === 'established-lines') ??
        me.memberships.find((entry) => entry.organization.slug !== 'atlas-platform');
      if (!selected) throw new Error('No seller organization is available');
      const rows = await request<Order[]>(`/organizations/${selected.organization.id}/orders`);
      setOrganization(selected.organization);
      setOrders(rows);
      setState('');
      setDrafts((current) => {
        const next = { ...current };
        for (const order of rows) {
          next[order.id] ??= { reference: '', shipping: '0.00', dueAt: dueDefault() };
        }
        return next;
      });
    } catch {
      setState('Sign in with a seller account to manage orders.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function issueInvoice(order: Order) {
    if (!organization) return;
    const draft = drafts[order.id];
    const shipping = Number(draft?.shipping ?? '0');
    if (!draft?.reference.trim() || !Number.isFinite(shipping) || shipping < 0 || !draft.dueAt) {
      setState(
        'Enter an external invoice reference, a non-negative shipping amount, and due date.',
      );
      return;
    }
    try {
      await request(`/organizations/${organization.id}/orders/${order.id}/invoice`, {
        method: 'POST',
        body: JSON.stringify({
          version: order.version,
          externalReference: draft.reference.trim(),
          shippingMinor: String(Math.round(shipping * 100)),
          dueAt: new Date(draft.dueAt).toISOString(),
        }),
      });
      await load();
    } catch {
      setState('The invoice could not be recorded. Refresh the order and try again.');
    }
  }

  async function markReady(order: Order) {
    if (!organization) return;
    try {
      await request(`/organizations/${organization.id}/orders/${order.id}/ready`, {
        method: 'POST',
        body: JSON.stringify({ version: order.version }),
      });
      await load();
    } catch {
      setState('The fulfillment update could not be saved. Refresh and try again.');
    }
  }

  return (
    <main className="portal-page order-operations-page">
      <header>
        <div>
          <p className="eyebrow">Seller OS · Orders</p>
          <h1>{organization?.name ?? 'Orders'}</h1>
        </div>
        <div className="actions">
          <Link href="/products">Catalog</Link>
          <Link href="/admin/orders">Admin confirmation queue</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/login">Switch account</Link>
        </div>
      </header>
      <p className="order-process-note">
        Issue the customer invoice outside DecorFlavor. Record only its reference, due date, and
        shipping amount here—never a payment link, card, or bank details.
      </p>
      {state ? <p className="notice">{state}</p> : null}
      {!state && !orders.length ? <p className="notice">There are no seller orders yet.</p> : null}
      <section className="operation-list">
        {orders.map((order) => {
          const canIssue =
            order.status === 'AWAITING_SELLER_INVOICE' ||
            (order.status === 'INVOICE_SENT' && order.manualInvoice?.status === 'REJECTED');
          const draft = drafts[order.id] ?? {
            reference: '',
            shipping: '0.00',
            dueAt: dueDefault(),
          };
          return (
            <article className="operation-card" key={order.id}>
              <p className="eyebrow">{order.status.replaceAll('_', ' ')}</p>
              <h2>{order.productTitleSnapshot}</h2>
              <p>
                Buyer · {order.buyer.displayName} ({order.buyer.email})
              </p>
              <p>Total · {money(order.totalMinor, order.currency)}</p>
              {order.manualInvoice ? (
                <p>
                  External invoice {order.manualInvoice.externalReference} ·{' '}
                  {order.manualInvoice.status.replaceAll('_', ' ')}
                </p>
              ) : null}
              {order.operational.isInvoiceOverdue ? (
                <p>
                  <strong>Attention · the external invoice is past its due date.</strong>
                </p>
              ) : null}
              {order.operational.requiresPaymentVerification ? (
                <p>
                  <strong>Buyer payment report is awaiting platform verification.</strong>
                </p>
              ) : null}
              {canIssue ? (
                <form
                  className="invoice-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void issueInvoice(order);
                  }}
                >
                  <label>
                    External invoice reference
                    <input
                      value={draft.reference}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [order.id]: { ...draft, reference: event.target.value },
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Shipping (USD)
                    <input
                      value={draft.shipping}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [order.id]: { ...draft, shipping: event.target.value },
                        }))
                      }
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="datetime-local"
                      value={draft.dueAt}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [order.id]: { ...draft, dueAt: event.target.value },
                        }))
                      }
                      required
                    />
                  </label>
                  <button>Record external invoice</button>
                </form>
              ) : null}
              {order.status === 'PAYMENT_CONFIRMED' ? (
                <button onClick={() => void markReady(order)}>Mark ready for fulfillment</button>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
