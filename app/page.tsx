'use client';

import { useCallback, useEffect, useState } from 'react';
import StreamPlayer from '@/components/StreamPlayer';
import { CHECKOUT_LABEL } from '@/lib/constants';

type View = 'loading' | 'pay' | 'stream';

export default function UFCAccess() {
  const [view, setView] = useState<View>('loading');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const unlockStream = useCallback(async () => {
    const streamRes = await fetch('/api/stream', { credentials: 'include' });
    if (!streamRes.ok) {
      setView('pay');
      return false;
    }

    const { url } = await streamRes.json();
    setStreamUrl(url);
    setView('stream');
    return true;
  }, []);

  const checkAccess = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');

    if (canceled) {
      setMessage('Payment canceled. Pay to unlock the stream.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (sessionId) {
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (verifyRes.ok) {
        const { paid } = await verifyRes.json();
        if (paid) {
          window.history.replaceState({}, '', window.location.pathname);
          await unlockStream();
          return;
        }
      }

      setMessage('Payment could not be verified. Try again.');
    }

    const accessRes = await fetch('/api/access', { credentials: 'include' });
    if (!accessRes.ok) {
      setView('pay');
      return;
    }

    const { paid } = await accessRes.json();
    if (paid) {
      await unlockStream();
      return;
    }

    setView('pay');
  }, [unlockStream]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const handleCheckout = async () => {
    setBusy(true);
    setMessage('');

    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setMessage(data.error ?? 'Could not start payment.');
        return;
      }

      window.location.href = data.url;
    } catch {
      setMessage('Payment could not be started.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

      <nav className="fixed top-0 z-50 w-full border-b border-red-600 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
          <div className="text-xl font-black tracking-tight sm:text-4xl sm:tracking-[-2px]">
            UFC ACCESS
          </div>
          <div className="text-[10px] font-mono tracking-widest text-red-500 sm:text-sm">
            AUTHORIZED LIVE
          </div>
        </div>
      </nav>

      <main className="relative mx-auto max-w-5xl px-4 pb-10 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        {view !== 'stream' && (
          <div className="mb-8 text-center sm:mb-16">
            <div className="mb-3 text-[10px] tracking-[3px] text-red-500 sm:mb-6 sm:text-sm sm:tracking-[4px]">
              UFC 329 • LIVE EVENT
            </div>
            <h1 className="mb-4 text-4xl font-black leading-none tracking-tight sm:mb-6 sm:text-7xl md:text-8xl md:tracking-[-3px]">
              MCGREGOR
              <br />
              VS HOLLOWAY
            </h1>
            <p className="text-base text-gray-400 sm:text-2xl">THE NOTORIOUS RETURNS</p>
          </div>
        )}

        {view === 'loading' && (
          <p className="text-center text-gray-400">Loading…</p>
        )}

        {view === 'pay' && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-600/50 bg-zinc-900 p-6 text-center sm:rounded-3xl sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl sm:mb-8 sm:h-20 sm:w-20 sm:text-4xl">
              🔒
            </div>
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-4xl">Unlock the Live Stream</h2>
            <p className="mb-6 text-sm text-gray-400 sm:mb-10 sm:text-base">
              One-time payment for full access to tonight&apos;s broadcast.
            </p>

            {message && <p className="mb-4 text-sm text-red-400">{message}</p>}

            <button
              onClick={handleCheckout}
              disabled={busy}
              className="mb-4 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
            >
              {busy ? 'Redirecting to Stripe…' : CHECKOUT_LABEL}
            </button>

            <p className="text-xs text-gray-500">Secure checkout via Stripe • Stream hidden until paid</p>
          </div>
        )}

        {view === 'stream' && streamUrl && (
          <div className="space-y-4 sm:space-y-8">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-red-500 sm:gap-4 sm:text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 sm:h-3 sm:w-3" />
              Live broadcast in progress
            </div>
            <StreamPlayer src={streamUrl} />
            <p className="text-center text-xs text-gray-500 sm:text-sm">
              Rotate your phone to landscape for fullscreen
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
