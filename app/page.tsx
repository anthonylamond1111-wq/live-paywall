'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import BrandIntro from '@/components/BrandIntro';
import BrandLogo from '@/components/BrandLogo';
import EventBanner from '@/components/EventBanner';
import EventCountdown from '@/components/EventCountdown';
import FAQ from '@/components/FAQ';
import FighterHero from '@/components/FighterHero';
import FreeVsPaid from '@/components/FreeVsPaid';
import JourneyProgress from '@/components/JourneyProgress';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import NotifyWhenLive from '@/components/NotifyWhenLive';
import PageBackground from '@/components/PageBackground';
import PaywallCard from '@/components/PaywallCard';
import PreviewStream from '@/components/PreviewStream';
import SiteFooter from '@/components/SiteFooter';
import StreamView from '@/components/StreamView';
import SuccessScreen from '@/components/SuccessScreen';
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

  const handleForgotPassword = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !email.trim()) {
      setMessage('Enter your email above, then tap forgot password.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setBusy(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent — check your inbox.');
    }
  };

  const handleBackToHome = () => {
    setStreamUrl(null);
    setView('success');
  };

  const isLoggedIn = !!session;
  const showEvent = isLoggedIn && (view === 'pay' || view === 'success');
  const showAuthGate = !isLoggedIn || view === 'auth';
  const showFooter = view !== 'stream';

  const journeyStep =
    view === 'stream'
      ? ('watch' as const)
      : view === 'pay'
        ? ('pay' as const)
        : view === 'success'
          ? ('pay' as const)
          : isLoggedIn
            ? ('account' as const)
            : ('preview' as const);

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
        {(showAuthGate || view === 'pay' || view === 'success') && (
          <JourneyProgress current={journeyStep} />
        )}

        {showAuthGate && <FighterHero />}
        {(showAuthGate || view === 'pay') && <EventCountdown />}
        {showAuthGate && <NotifyWhenLive />}

        {view === 'loading' && isLoggedIn && <LoadingSkeleton />}

        {showAuthGate && (
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <PreviewStream />
            <FreeVsPaid />

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

              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={busy}
                  className="mt-2 w-full text-sm text-gray-500 underline transition hover:text-red-400"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <FAQ />
          </div>
        )}

        {view === 'pay' && isLoggedIn && (
          <>
            <PaywallCard
              email={session?.user.email}
              message={message}
              busy={busy}
              onCheckout={handleCheckout}
            />
            <div className="mx-auto mt-8 max-w-md">
              <FAQ />
            </div>
          </>
        )}

        {view === 'success' && isLoggedIn && (
          <SuccessScreen
            email={session?.user.email}
            purchaseJustCompleted={purchaseJustCompleted}
            busy={busy}
            onWatch={handleWatchStream}
          />
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
