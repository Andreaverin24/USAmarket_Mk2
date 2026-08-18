'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, clientRequest } from '../lib/client-api';
import type { MarketplaceOrder } from '../lib/orders';

export function ReserveItemButton({ productId, slug }: { productId: string; slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState('');

  async function reserve() {
    setState('working');
    setError('');
    try {
      const order = await clientRequest<MarketplaceOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      router.push(`/account/orders/${order.id}`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.push(`/login?returnTo=${encodeURIComponent(`/products/${slug}`)}`);
        return;
      }
      setError('This item could not be reserved. It may have just become unavailable.');
    } finally {
      setState('idle');
    }
  }

  return (
    <div className="df-order-cta">
      <button type="button" onClick={() => void reserve()} disabled={state === 'working'}>
        {state === 'working' ? 'Reserving…' : 'Reserve & await seller invoice'}
      </button>
      <p>
        DecorFlavor does not take payment. The seller will send an invoice outside the platform; you
        can then report payment here for manual admin confirmation.
      </p>
      {error ? (
        <p className="order-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
