'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../../../lib/api';

type SupportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';

interface SupportCase {
  id: string;
  subject: string;
  category: string;
  status: SupportStatus;
  version: number;
  updatedAt: string;
  buyer: { displayName: string; email: string };
  order: { productTitleSnapshot: string; status: string; seller: { name: string } };
  events: Array<{ id: string; toStatus: string; note: string | null; createdAt: string }>;
}

const label = (value: string) => value.replaceAll('_', ' ');

export default function AdminSupportPage() {
  const [supportCases, setSupportCases] = useState<SupportCase[]>([]);
  const [status, setStatus] = useState<SupportStatus | ''>('');
  const [state, setState] = useState('Loading support queue…');
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load(nextStatus = status) {
    try {
      const query = nextStatus ? `?status=${nextStatus}` : '';
      setSupportCases(await request<SupportCase[]>(`/admin/support-cases${query}`));
      setState('');
    } catch {
      setState('Sign in as DecorFlavor platform support to view this queue.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(supportCase: SupportCase, action: 'start-review' | 'resolve') {
    const note = notes[supportCase.id]?.trim() ?? '';
    if (action === 'resolve' && !note) {
      setState('A buyer-visible resolution note is required before resolving a support case.');
      return;
    }
    try {
      await request(`/admin/support-cases/${supportCase.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ version: supportCase.version, action, ...(note ? { note } : {}) }),
      });
      setNotes((current) => ({ ...current, [supportCase.id]: '' }));
      await load();
    } catch {
      setState('The support update could not be saved. Refresh the queue and try again.');
    }
  }

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(status);
  }

  return (
    <main className="portal-page order-operations-page">
      <header>
        <div>
          <p className="eyebrow">Platform operations · Support</p>
          <h1>Buyer support queue</h1>
        </div>
        <div className="actions">
          <Link href="/admin/orders">Order operations</Link>
          <Link href="/admin/dealers">Dealer operations</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/login">Switch account</Link>
        </div>
      </header>
      <p className="order-process-note">
        Cases are private between the buyer and DecorFlavor platform support. They are not payment
        disputes and must not contain payment details, external invoice files, or proof of payment.
      </p>
      <form className="operations-form" onSubmit={filter}>
        <label>
          Case status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as SupportStatus | '')}
          >
            <option value="">All cases</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In review</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
        <div className="operations-form-actions">
          <button>Apply filter</button>
        </div>
      </form>
      {state ? (
        <p className="notice" role="alert">
          {state}
        </p>
      ) : null}
      {!state && !supportCases.length ? (
        <p className="notice">No support cases match this view.</p>
      ) : null}
      <section className="operation-list">
        {supportCases.map((supportCase) => (
          <article className="operation-card" key={supportCase.id}>
            <p className="eyebrow">
              {label(supportCase.status)} · {label(supportCase.category)}
            </p>
            <h2>{supportCase.subject}</h2>
            <p>
              {supportCase.order.productTitleSnapshot} · seller {supportCase.order.seller.name}
            </p>
            <p>
              Buyer · {supportCase.buyer.displayName} ({supportCase.buyer.email})
            </p>
            <div className="case-timeline">
              {supportCase.events.map((entry) => (
                <p key={entry.id}>
                  <strong>{label(entry.toStatus)}</strong>
                  {entry.note ? ` · ${entry.note}` : ''}
                </p>
              ))}
            </div>
            {supportCase.status !== 'RESOLVED' ? (
              <div className="support-resolution">
                <label>
                  Buyer-visible note
                  <textarea
                    value={notes[supportCase.id] ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [supportCase.id]: event.target.value }))
                    }
                    maxLength={2000}
                    placeholder="Explain the next step or resolution."
                  />
                </label>
                <div className="actions">
                  {supportCase.status === 'OPEN' ? (
                    <button
                      className="outline-button"
                      onClick={() => void update(supportCase, 'start-review')}
                    >
                      Start review
                    </button>
                  ) : null}
                  <button onClick={() => void update(supportCase, 'resolve')}>Resolve case</button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
