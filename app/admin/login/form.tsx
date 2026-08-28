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
        throw new Error(body.error || 'Las credenciales no son válidas.');
      }
      router.push('/admin/catalog');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Las credenciales no son válidas.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      <label className="grid gap-1 text-sm font-medium">Código del comercio<input className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" name="businessCode" aria-label="Código del comercio" required /></label>
      <label className="grid gap-1 text-sm font-medium">Contraseña<input className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" name="password" aria-label="Contraseña" type="password" required /></label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} type="submit">{pending ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  );
}
