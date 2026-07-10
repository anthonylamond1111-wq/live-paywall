'use client';

import { useEffect, useState } from 'react';
import { hasStreamStarted } from '@/lib/event';

const NOTIFY_KEY = 'ufc_notify_enabled';
const EMAIL_KEY = 'ufc_notify_email';

export default function NotifyWhenLive() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [browserEnabled, setBrowserEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setStatus('done');
      setMessage('You\'ll be notified when the stream goes live.');
    }
    setBrowserEnabled(localStorage.getItem(NOTIFY_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!browserEnabled || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const check = () => {
      if (hasStreamStarted() && document.hidden) {
        new Notification('UFC Access — Stream is live!', {
          body: 'The broadcast has started. Tap to watch now.',
          icon: '/icon.svg',
        });
      }
    };

    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [browserEnabled]);

  const requestBrowserNotify = async () => {
    if (typeof Notification === 'undefined') return false;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem(NOTIFY_KEY, '1');
      setBrowserEnabled(true);
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setMessage('');

    await requestBrowserNotify();

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 503) {
          localStorage.setItem(EMAIL_KEY, trimmed);
          localStorage.setItem(NOTIFY_KEY, '1');
          setStatus('done');
          setMessage('Browser notifications enabled. We\'ll alert you when the stream goes live.');
          return;
        }
        throw new Error(data.error ?? 'Failed');
      }

      localStorage.setItem(EMAIL_KEY, trimmed);
      setStatus('done');
      setMessage('You\'re on the list — we\'ll notify you when the stream goes live.');
    } catch {
      setStatus('error');
      setMessage('Could not save. Try enabling browser notifications instead.');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-center">
        <p className="text-sm text-green-400">✓ {message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4">
      <p className="mb-3 text-center text-sm font-medium text-white">Notify me when live</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {status === 'loading' ? 'Saving…' : 'Notify me'}
        </button>
      </form>
      {message && status === 'error' && (
        <p className="mt-2 text-center text-xs text-red-400">{message}</p>
      )}
      <p className="mt-2 text-center text-[10px] text-gray-600">
        Browser notifications + email reminder when we go live
      </p>
    </div>
  );
}
