'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import StreamPlayer, { useStreamFullscreen } from '@/components/StreamPlayer';
import LiveChat from '@/components/LiveChat';
import { CHECKOUT_LABEL } from '@/lib/constants';
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
  const [playerMode, setPlayerMode] = useState<'normal' | 'fullscreen'>('normal');
  const [purchaseJustCompleted, setPurchaseJustCompleted] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);

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
    setPlayerMode('normal');
    setPurchaseJustCompleted(false);
    setView('auth');
    setMessage('');
  };

  const { enter: enterNativeFullscreen, exit: exitNativeFullscreen } =
    useStreamFullscreen(fullscreenRef);

  const handleEnterFullscreen = async () => {
    setPlayerMode('fullscreen');
    window.setTimeout(async () => {
      const entered = await enterNativeFullscreen();
      if (!entered) {
        // CSS overlay fallback is already active via playerMode
      }
    }, 50);
  };

  const handleExitFullscreen = async () => {
    await exitNativeFullscreen();
    setPlayerMode('normal');
  };

  const handleBackToHome = () => {
    setPlayerMode('normal');
    setStreamUrl(null);
    setView('success');
  };

  useEffect(() => {
    if (playerMode !== 'fullscreen') return;

    document.body.style.overflow = 'hidden';

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setPlayerMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [playerMode]);

  const isLoggedIn = !!session;
  const showEvent = isLoggedIn && (view === 'pay' || view === 'success');
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

        {view === 'success' && isLoggedIn && (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl sm:mb-8 sm:h-20 sm:w-20 sm:text-4xl">
              ✓
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
              className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
            >
              {busy ? 'Loading stream…' : 'Watch live stream'}
            </button>
          </div>
        )}

        {view === 'stream' && isLoggedIn && streamUrl && session && (
          <div
            ref={fullscreenRef}
            className={
              playerMode === 'fullscreen'
                ? 'fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
                : 'space-y-3 sm:space-y-4'
            }
          >
            {playerMode === 'fullscreen' ? (
              <div className="flex shrink-0 items-center justify-between border-b border-red-600/40 bg-black/90 px-4 py-3">
                <span className="text-sm font-black tracking-tight sm:text-lg">UFC ACCESS</span>
                <button
                  type="button"
                  onClick={handleExitFullscreen}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 sm:text-sm"
                >
                  Exit fullscreen
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-red-500 sm:justify-start sm:gap-4 sm:text-sm">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 sm:h-3 sm:w-3" />
                  Live broadcast in progress
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackToHome}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 sm:text-sm"
                  >
                    Back to home
                  </button>
                  <button
                    type="button"
                    onClick={handleEnterFullscreen}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black sm:text-sm"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            )}

            <div
              className={
                playerMode === 'fullscreen'
                  ? 'min-h-0 flex-1'
                  : 'flex flex-col gap-4 landscape:flex-row landscape:items-stretch lg:grid lg:grid-cols-[1fr_340px] lg:gap-6'
              }
            >
              <div
                className={
                  playerMode === 'fullscreen' ? 'h-full min-h-0' : 'min-w-0 landscape:flex-[1.4]'
                }
              >
                <StreamPlayer src={streamUrl} fill={playerMode === 'fullscreen'} />
              </div>

              {playerMode === 'normal' && (
                <div className="min-h-0 landscape:flex-1 landscape:max-w-sm lg:max-w-none">
                  <LiveChat session={session} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
