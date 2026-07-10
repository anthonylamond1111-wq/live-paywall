'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import BrandIntro from '@/components/BrandIntro';
import BrandLogo from '@/components/BrandLogo';
import EventBanner from '@/components/EventBanner';
import EventCountdown from '@/components/EventCountdown';
import PageBackground from '@/components/PageBackground';
import PaywallCard from '@/components/PaywallCard';
import PreviewStream from '@/components/PreviewStream';
import SiteFooter from '@/components/SiteFooter';
import StreamView from '@/components/StreamView';
import { getSupabaseClient } from '@/lib/supabase/client';

type View = 'loading' | 'auth' | 'pay' | 'success' | 'stream';

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
  const [purchaseJustCompleted, setPurchaseJustCompleted] = useState(false);

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
            setPurchaseJustCompleted(true);
            setView('success');
            return;
          }
        }

        setMessage('Payment could not be verified. Try again.');
      }

      const accessRes = await authFetch(activeSession, '/api/access');
      if (accessRes.status === 401) {
        setView('auth');
        setMessage('Your session expired. Please log in again.');
        return;
      }

      if (!accessRes.ok) {
        setView('pay');
        setMessage('Could not verify access. Try refreshing the page.');
        return;
      }

      const { paid } = await accessRes.json();
      if (paid) {
        setView('success');
        return;
      }

      setView('pay');
      setMessage(
        `No payment found for ${activeSession.user.email}. Log in with the same email you used at checkout (your Stripe receipt).`
      );
    },
    []
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

  const handleWatchStream = async () => {
    if (!session) return;

    setBusy(true);
    setMessage('');
    await unlockStream(session);
    setBusy(false);
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
    setPurchaseJustCompleted(false);
    setView('auth');
    setMessage('');
  };

  const handleBackToHome = () => {
    setStreamUrl(null);
    setView('success');
  };

  const isLoggedIn = !!session;
  const showEvent = isLoggedIn && (view === 'pay' || view === 'success');
  const showAuthGate = !isLoggedIn || view === 'auth';
  const showFooter = view !== 'stream';

  return (
    <div className="relative min-h-[100dvh] bg-black text-white">
      <BrandIntro />
      <PageBackground />
      <AddToHomeScreen />

      <nav className="fixed top-0 z-50 w-full border-b border-red-600/80 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
          <BrandLogo />
          <div className="flex items-center gap-3 sm:gap-6">
            {isLoggedIn && view === 'stream' && (
              <div className="live-badge hidden items-center gap-2 sm:flex">
                <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-mono tracking-widest text-red-500 sm:text-sm">
                  AUTHORIZED LIVE
                </span>
              </div>
            )}
            {isLoggedIn && view !== 'stream' && (
              <div className="text-[10px] font-mono tracking-widest text-red-500 sm:text-sm">
                AUTHORIZED
              </div>
            )}
            {session && (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[10px] text-gray-400 underline transition hover:text-white sm:text-xs"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main
        className={`relative mx-auto max-w-5xl px-4 sm:px-6 ${
          view === 'stream' ? 'max-w-6xl pb-6 pt-24 sm:pt-28' : 'pb-10 pt-24 sm:pb-20 sm:pt-28'
        }`}
      >
        {showEvent && <EventBanner />}
        {(showAuthGate || view === 'pay') && <EventCountdown />}

        {view === 'loading' && isLoggedIn && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            <p className="text-gray-400">Loading your access…</p>
          </div>
        )}

        {showAuthGate && (
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <PreviewStream />

            <div className="rounded-2xl border border-red-600/50 bg-zinc-900/90 p-6 shadow-lg shadow-red-900/5 sm:rounded-3xl sm:p-10">
              <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
                {authMode === 'login' ? 'Log in' : 'Create your account'}
              </h2>
              <p className="mb-6 text-center text-sm text-gray-400">
                Create an account to watch the official stream after your free preview. Your
                purchase is saved to your account so you can come back anytime.
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
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={busy || (view === 'loading' && !isLoggedIn)}
                  className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
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
                className="mt-4 w-full text-sm text-gray-400 underline transition hover:text-white"
              >
                {authMode === 'login'
                  ? 'Need an account? Sign up'
                  : 'Already have an account? Log in'}
              </button>
            </div>
          </div>
        )}

        {view === 'pay' && isLoggedIn && (
          <PaywallCard
            email={session?.user.email}
            message={message}
            busy={busy}
            onCheckout={handleCheckout}
          />
        )}

        {view === 'success' && isLoggedIn && (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 sm:mb-8 sm:h-20 sm:w-20">
              <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-green-400 sm:mb-4 sm:text-4xl">
              {purchaseJustCompleted ? 'Purchase successful!' : "You're cleared to watch"}
            </h2>
            <p className="mb-8 text-sm text-gray-400 sm:mb-10 sm:text-base">
              {purchaseJustCompleted
                ? 'Your payment went through. Tap below when you are ready to join the live stream.'
                : 'Your access is saved to your account. Tap below to join the live stream.'}
            </p>

            {session?.user.email && (
              <p className="mb-6 text-sm text-gray-500">Signed in as {session.user.email}</p>
            )}

            <button
              type="button"
              onClick={handleWatchStream}
              disabled={busy}
              className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
            >
              {busy ? 'Loading stream…' : 'Watch live stream'}
            </button>
          </div>
        )}

        {view === 'stream' && isLoggedIn && streamUrl && session && (
          <StreamView
            session={session}
            streamUrl={streamUrl}
            onBackToHome={handleBackToHome}
          />
        )}

        {showFooter && <SiteFooter />}
      </main>
    </div>
  );
}
