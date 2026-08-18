'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, clientRequest } from '../../../lib/client-api';
import { formatMoney, orderStatusLabel, type MarketplaceOrder } from '../../../lib/orders';

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [state, setState] = useState('Loading your reservations…');

  useEffect(() => {
    void (async () => {
      try {
        const rows = await clientRequest<MarketplaceOrder[]>('/me/orders');
        setOrders(rows);
        setState('');
      } catch (caught) {
        setState(
          caught instanceof ApiError && caught.status === 401
            ? 'Sign in to view your reservations.'
            : 'Orders are temporarily unavailable.',
        );
      }
    })();
  }, []);

  return (
    <main className="orders-page">
      <p className="eyebrow">DecorFlavor account</p>
      <h1>Your reservations</h1>
      <Link href="/account/support">Order support</Link>
      {state ? <p className="state">{state}</p> : null}
      {!state && !orders.length ? (
        <p className="state">No reservations yet. Browse the catalog to find an object.</p>
      ) : null}
      <section className="order-list">
        {orders.map((order) => (
          <Link key={order.id} className="order-card" href={`/account/orders/${order.id}`}>
            <p className="eyebrow">{orderStatusLabel[order.status]}</p>
            <h2>{order.productTitleSnapshot}</h2>
            <p>
              {formatMoney(order.totalMinor, order.currency)} · {order.seller.name}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
