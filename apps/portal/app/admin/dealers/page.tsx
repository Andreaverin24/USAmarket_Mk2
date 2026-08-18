'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { request } from '../../../lib/api';

interface Application {
  id: string;
  legalBusinessName: string;
  publicDealerName: string;
  status: string;
  reviewReason?: string;
  version: number;
  organization: { name: string; slug: string };
}

export default function DealerReviewPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState('Loading dealer queue…');
  async function load() {
    try {
      setApplications(await request<Application[]>('/admin/dealer-applications'));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load dealer queue.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function review(application: Application, action: string) {
    const needsReason = ['request_changes', 'reject', 'suspend'].includes(action);
    const reason = needsReason ? window.prompt('Required reason') : undefined;
    if (needsReason && !reason) return;
    try {
      await request(`/admin/dealer-applications/${application.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, reason, version: application.version }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Review action failed.');
    }
  }
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">DecorFlavor · Admin operations</p>
          <h1>Dealer review queue</h1>
        </div>
        <Link href="/admin/moderation">Product moderation</Link>
      </header>
      {message ? <p className="notice">{message}</p> : null}
      <section className="operation-list">
        {applications.map((application) => (
          <article className="operation-card" key={application.id}>
            <p className="eyebrow">{application.status}</p>
            <h2>{application.publicDealerName}</h2>
            <p>{application.legalBusinessName}</p>
            {application.reviewReason ? <p>Reason: {application.reviewReason}</p> : null}
            <div className="actions">
              {application.status === 'SUBMITTED' ? (
                <button onClick={() => void review(application, 'start_review')}>
                  Start review
                </button>
              ) : null}
              {application.status === 'UNDER_REVIEW' ? (
                <>
                  <button onClick={() => void review(application, 'request_changes')}>
                    Request changes
                  </button>
                  <button onClick={() => void review(application, 'approve')}>Approve</button>
                  <button onClick={() => void review(application, 'reject')}>Reject</button>
                </>
              ) : null}
              {application.status === 'APPROVED' ? (
                <button onClick={() => void review(application, 'suspend')}>Suspend</button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
