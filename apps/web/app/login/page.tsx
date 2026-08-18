'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { CLIENT_API_URL } from '../../lib/client-api';

function returnPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/account/orders';
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="account-auth"><p className="state">Loading account…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${CLIENT_API_URL}/auth/${mode === 'login' ? 'login' : 'register'}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
      body: JSON.stringify({
        ...(mode === 'register' ? { displayName: data.get('displayName') } : {}),
        email: data.get('email'),
        password: data.get('password'),
      }),
    });
    if (!response.ok) {
      setError(mode === 'login' ? 'Unable to sign in with these credentials.' : 'Unable to create account.');
      setBusy(false);
      return;
    }
    const result = (await response.json()) as { csrfToken: string };
    sessionStorage.setItem('decorflavor_csrf', result.csrfToken);
    router.replace(returnPath(params.get('returnTo')));
  }

  return (
    <main className="account-auth">
      <p className="eyebrow">DecorFlavor account</p>
      <h1>{mode === 'login' ? 'Sign in to reserve an object' : 'Create your buyer account'}</h1>
      <p className="auth-explainer">
        Reservations are followed by an invoice from the seller outside DecorFlavor. We do not
        collect card, bank, or payment-account details.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        {mode === 'register' ? (
          <label>
            Your name
            <input name="displayName" autoComplete="name" required minLength={2} />
          </label>
        ) : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={10} />
        </label>
        {error ? <p className="order-error" role="alert">{error}</p> : null}
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New to DecorFlavor? Create an account' : 'Already have an account? Sign in'}
      </button>
    </main>
  );
}
