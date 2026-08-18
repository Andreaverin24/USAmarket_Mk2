'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, clientRequest } from '../../../lib/client-api';
import styles from './support.module.css';

interface BuyerOrder {
  id: string;
  productTitleSnapshot: string;
  status: string;
}

interface SupportCase {
  id: string;
  orderId: string;
  category: 'ORDER_STATUS' | 'EXTERNAL_INVOICE' | 'FULFILLMENT' | 'OTHER';
  subject: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  version: number;
  createdAt: string;
  updatedAt: string;
  order: { id: string; productTitleSnapshot: string; status: string; seller: { name: string } };
  events: Array<{
    id: string;
    action: string;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
}

const categoryLabels: Record<SupportCase['category'], string> = {
  ORDER_STATUS: 'Order status',
  EXTERNAL_INVOICE: 'External seller invoice',
  FULFILLMENT: 'Fulfillment preparation',
  OTHER: 'Other order question',
};

function BuyerSupportContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [orderId, setOrderId] = useState(searchParams.get('orderId') ?? '');
  const [category, setCategory] = useState<SupportCase['category']>('ORDER_STATUS');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('Loading support…');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [nextOrders, nextCases] = await Promise.all([
        clientRequest<BuyerOrder[]>('/me/orders'),
        clientRequest<SupportCase[]>('/me/support-cases'),
      ]);
      setOrders(nextOrders);
      setCases(nextCases);
      setOrderId((current) => current || nextOrders[0]?.id || '');
      setState('');
    } catch (caught) {
      setState(
        caught instanceof ApiError && caught.status === 401
          ? 'Sign in to view support for your orders.'
          : 'Support is temporarily unavailable.',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderId) {
      setState('Choose one of your orders before opening a support case.');
      return;
    }
    setBusy(true);
    setState('');
    try {
      await clientRequest('/me/support-cases', {
        method: 'POST',
        body: JSON.stringify({ orderId, category, subject, message }),
      });
      setSubject('');
      setMessage('');
      await load();
    } catch {
      setState('The support case could not be opened. Check the order and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`orders-page ${styles.supportPage}`}>
      <div>
        <Link href="/account/orders">← Your reservations</Link>
        <p className="eyebrow">DecorFlavor support</p>
        <h1>Order support</h1>
        <p>
          Ask about an order here. Do not send payment details, bank information, invoice files, or
          proof of payment through DecorFlavor.
        </p>
      </div>

      {state ? (
        <p className="state" role="alert">
          {state}
        </p>
      ) : null}

      {!state ? (
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <h2>Open a support case</h2>
          <label>
            Order
            <select value={orderId} onChange={(event) => setOrderId(event.target.value)} required>
              <option value="">Choose an order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.productTitleSnapshot} — {order.status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportCase['category'])}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              minLength={3}
              maxLength={160}
              required
            />
          </label>
          <label>
            Your message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={2000}
              required
            />
          </label>
          <button disabled={busy}>{busy ? 'Opening…' : 'Open support case'}</button>
        </form>
      ) : null}

      {!state && cases.length ? (
        <section className={styles.caseList} aria-label="Your support cases">
          <h2>Your cases</h2>
          {cases.map((supportCase) => (
            <article className={styles.case} key={supportCase.id}>
              <p className="eyebrow">
                {supportCase.status.replaceAll('_', ' ')} · {categoryLabels[supportCase.category]}
              </p>
              <h2>{supportCase.subject}</h2>
              <p>
                {supportCase.order.productTitleSnapshot} · {supportCase.order.seller.name}
              </p>
              <div className={styles.timeline}>
                {supportCase.events.map((entry) => (
                  <div key={entry.id}>
                    <p>
                      <strong>{entry.toStatus.replaceAll('_', ' ')}</strong> ·{' '}
                      {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                        new Date(entry.createdAt),
                      )}
                    </p>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

export default function BuyerSupportPage() {
  return (
    <Suspense
      fallback={
        <main className="orders-page">
          <p className="state">Loading support…</p>
        </main>
      }
    >
      <BuyerSupportContent />
    </Suspense>
  );
}
