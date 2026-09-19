'use client';

import { useState } from 'react';

type RestoreAccessFormProps = {
  busy?: boolean;
  onRestored: () => void;
};

export default function RestoreAccessForm({ busy = false, onRestored }: RestoreAccessFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? 'Could not restore access.');
        return;
      }

      onRestored();
    } catch {
      setMessage('Could not restore access. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="restore"
      className="scroll-mt-28 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:rounded-3xl sm:p-6"
    >
      <h2 className="text-center text-lg font-semibold text-white">Already paid?</h2>
      <p className="mt-2 text-center text-sm text-gray-400">
        Enter the same email from your Stripe receipt to unlock this device. This signs
        out any other device using that purchase.
      </p>

      <form onSubmit={handleRestore} className="mt-5 space-y-3">
        <input
          type="email"
          required
          placeholder="Receipt email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy || loading}
          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none transition focus:border-red-500 disabled:opacity-60"
        />
        {message && <p className="text-center text-sm text-red-400">{message}</p>}
        <button
          type="submit"
          disabled={busy || loading}
          className="w-full rounded-xl border border-zinc-600 bg-transparent py-3 text-sm font-medium text-white transition hover:border-zinc-400 disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Restore access'}
        </button>
      </form>
    </div>
  );
}
