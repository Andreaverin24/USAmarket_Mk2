'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { request } from '../../../lib/api';

interface Review {
  id: string;
  status: string;
  submittedVersion: number;
  organization: { id: string; name: string };
  product: { id: string; title: string; status: string };
}

export default function ProductModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState('Loading moderation queue…');
  async function load() {
    try {
      setReviews(await request<Review[]>('/admin/product-moderation'));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load moderation queue.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function moderate(review: Review, action: 'reject' | 'approve' | 'publish') {
    const note = action === 'reject' ? window.prompt('Required changes') : undefined;
    if (action === 'reject' && !note) return;
    try {
      await request(
        `/organizations/${review.organization.id}/catalog/products/${review.product.id}/moderation`,
        { method: 'POST', body: JSON.stringify({ action, note }) },
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Moderation action failed.');
    }
  }
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">DecorFlavor · Admin operations</p>
          <h1>Product moderation</h1>
        </div>
        <Link href="/admin/dealers">Dealer applications</Link>
      </header>
      {message ? <p className="notice">{message}</p> : null}
      <section className="operation-list">
        {reviews.map((review) => (
          <article className="operation-card" key={review.id}>
            <p className="eyebrow">
              {review.organization.name} · review {review.status}
            </p>
            <h2>{review.product.title}</h2>
            <p>
              Product status {review.product.status}; submitted version {review.submittedVersion}
            </p>
            <div className="actions">
              {review.product.status === 'SUBMITTED' ? (
                <>
                  <button onClick={() => void moderate(review, 'reject')}>Request changes</button>
                  <button onClick={() => void moderate(review, 'approve')}>Approve</button>
                </>
              ) : null}
              {review.product.status === 'APPROVED' ? (
                <button onClick={() => void moderate(review, 'publish')}>Publish</button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
