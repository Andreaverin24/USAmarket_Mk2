'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    });
    if (!response.ok) {
      setError('Unable to sign in. Check your credentials.');
      return;
    }
    const result = (await response.json()) as { csrfToken: string };
    sessionStorage.setItem('atlas_csrf', result.csrfToken);
    router.push('/products');
  }
  return (
    <main className="login">
      <p className="eyebrow">Atlas Seller Portal</p>
      <h1>Welcome back</h1>
      <form onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" defaultValue="seller@atlas.local" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button>Sign in</button>
      </form>
    </main>
  );
}
