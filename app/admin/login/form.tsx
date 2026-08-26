'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessCode: form.get('businessCode'), password: form.get('password') }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Invalid credentials');
      }
      router.push('/admin/catalog');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid credentials');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={submit}>
      <label>Business code<input className="mt-1 w-full rounded border p-2" name="businessCode" required /></label>
      <label>Password<input className="mt-1 w-full rounded border p-2" name="password" type="password" required /></label>
      {error && <p role="alert">{error}</p>}
      <button className="rounded bg-black p-2 text-white" disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
