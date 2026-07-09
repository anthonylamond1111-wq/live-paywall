'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import StreamPlayer from '@/components/StreamPlayer';
import LiveChat from '@/components/LiveChat';
import { CHECKOUT_LABEL } from '@/lib/constants';
import { getSupabaseClient } from '@/lib/supabase/client';

type View = 'loading' | 'auth' | 'pay' | 'stream';

async function authFetch(
  session: Session,
  input: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

export default function UFCAccess() {
  const [view, setView] = useState<View>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const unlockStream = useCallback(async (activeSession: Session) => {
    const streamRes = await authFetch(activeSession, '/api/stream');
    if (!streamRes.ok) {
      setView('pay');
      return false;
    }

    const { url } = await streamRes.json();
    setStreamUrl(url);
    setView('stream');
    return true;
  }, []);

  const checkAccess = useCallback(
    async (activeSession: Session) => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const canceled = params.get('canceled');

      if (canceled) {
        setMessage('Payment canceled. Pay to unlock the stream.');
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (sessionId) {
        const verifyRes = await authFetch(activeSession, '/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (verifyRes.ok) {
          const { paid } = await verifyRes.json();
          if (paid) {
            window.history.replaceState({}, '', window.location.pathname);
            await unlockStream(activeSession);
            return;
          }
        }

        setMessage('Payment could not be verified. Try again.');
      }

      const accessRes = await authFetch(activeSession, '/api/access');
      if (!accessRes.ok) {
        setView('pay');
        return;
      }

      const { paid } = await accessRes.json();
      if (paid) {
        await unlockStream(activeSession);
        return;
      }

      setView('pay');
    },
    [unlockStream]
  );

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Sign-in is not configured. Contact support.');
      setView('auth');
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      const current = data.session;
      setSession(current);

      if (current) {
        void checkAccess(current);
      } else {
        setView('auth');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setStreamUrl(null);
        setView('auth');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAccess]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    try {
      const result =
        authMode === 'signup'
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (authMode === 'signup' && !result.data.session) {
        setMessage('Check your email to confirm your account, then log in.');
        setAuthMode('login');
        return;
      }

      const activeSession = result.data.session;
      if (activeSession) {
        setSession(activeSession);
        await checkAccess(activeSession);
      }
    } catch {
      setMessage('Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async () => {
    if (!session) {
      setView('auth');
      setMessage('Log in first to keep your stream access.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const res = await authFetch(session, '/api/checkout', { method: 'POST' });
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

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
    setStreamUrl(null);
    setView('auth');
    setMessage('');
  };

  const isLoggedIn = !!session;
  const showEvent = isLoggedIn && view === 'pay';
  const showAuthGate = !isLoggedIn || view === 'auth';

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

      <nav className="fixed top-0 z-50 w-full border-b border-red-600 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
          <div className="text-xl font-black tracking-tight sm:text-4xl sm:tracking-[-2px]">
            UFC ACCESS
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            {isLoggedIn && (
              <div className="text-[10px] font-mono tracking-widest text-red-500 sm:text-sm">
                AUTHORIZED LIVE
              </div>
            )}
            {session && (
              <button
                onClick={handleSignOut}
                className="text-[10px] text-gray-400 underline sm:text-xs"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main
        className={`relative mx-auto max-w-5xl px-4 pb-10 sm:px-6 sm:pb-20 ${
          showAuthGate ? 'flex min-h-[100dvh] items-center pt-20' : 'pt-24 sm:pt-32'
        }`}
      >
        {showEvent && (
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

        {view === 'loading' && isLoggedIn && (
          <p className="text-center text-gray-400">Loading…</p>
        )}

        {showAuthGate && (
          <div className="mx-auto w-full max-w-md rounded-2xl border border-red-600/50 bg-zinc-900 p-6 sm:rounded-3xl sm:p-10">
            <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
              {authMode === 'login' ? 'Log in' : 'Create your account'}
            </h2>
            <p className="mb-6 text-center text-sm text-gray-400">
              Create an account to access tonight&apos;s live stream. Your purchase is saved to
              your account so you can come back anytime.
            </p>

            {message && <p className="mb-4 text-center text-sm text-red-400">{message}</p>}

            {view === 'loading' && !isLoggedIn && (
              <p className="mb-4 text-center text-sm text-gray-400">Loading…</p>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={busy || (view === 'loading' && !isLoggedIn)}
                className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition active:scale-[0.985] disabled:opacity-60"
              >
                {busy
                  ? 'Please wait…'
                  : authMode === 'login'
                    ? 'Log in'
                    : 'Create account & continue'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setMessage('');
              }}
              className="mt-4 w-full text-sm text-gray-400 underline"
            >
              {authMode === 'login'
                ? 'Need an account? Sign up'
                : 'Already have an account? Log in'}
            </button>
          </div>
        )}

        {view === 'pay' && isLoggedIn && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-600/50 bg-zinc-900 p-6 text-center sm:rounded-3xl sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl sm:mb-8 sm:h-20 sm:w-20 sm:text-4xl">
              🔒
            </div>
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-4xl">Unlock the Live Stream</h2>
            <p className="mb-6 text-sm text-gray-400 sm:mb-10 sm:text-base">
              One-time payment for full access. Your purchase stays on your account — come back
              anytime and log in to watch.
            </p>

            {session?.user.email && (
              <p className="mb-4 text-sm text-gray-500">Signed in as {session.user.email}</p>
            )}

            {message && <p className="mb-4 text-sm text-red-400">{message}</p>}

            <button
              onClick={handleCheckout}
              disabled={busy}
              className="mb-4 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
            >
              {busy ? 'Redirecting to Stripe…' : CHECKOUT_LABEL}
            </button>

            <p className="text-xs text-gray-500">
              Secure checkout via Stripe • Apple Pay & Google Pay accepted
            </p>
          </div>
        )}

        {view === 'stream' && isLoggedIn && streamUrl && session && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-red-500 sm:gap-4 sm:text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 sm:h-3 sm:w-3" />
              Live broadcast in progress
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6">
              <div className="space-y-4">
                <StreamPlayer src={streamUrl} />
                <p className="text-center text-xs text-gray-500 sm:text-sm">
                  Rotate your phone to landscape for fullscreen
                </p>
              </div>
              <LiveChat session={session} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
