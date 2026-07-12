'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LockPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Wrong password.');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not unlock. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">
          Site locked
        </p>
        <h1 className="mt-3 text-2xl font-bold">Private access only</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter the site password to continue.
        </p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-white py-3 font-semibold text-black disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
