'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { request } from '../../lib/api';

interface Notification {
  id: string;
  subject: string;
  body: string;
  status: string;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState('Loading notifications…');
  async function load() {
    try {
      setNotifications(await request<Notification[]>('/notifications'));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load notifications.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function read(notificationId: string) {
    await request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    await load();
  }
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">THE GUILD</p>
          <h1>Notifications</h1>
        </div>
        <Link href="/products">Seller catalog</Link>
      </header>
      {message ? <p className="notice">{message}</p> : null}
      <section className="operation-list">
        {notifications.map((notification) => (
          <article className="operation-card" key={notification.id}>
            <p className="eyebrow">{notification.status}</p>
            <h2>{notification.subject}</h2>
            <p>{notification.body}</p>
            {!notification.readAt ? (
              <button onClick={() => void read(notification.id)}>Mark read</button>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
