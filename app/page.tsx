'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import BrandIntro from '@/components/BrandIntro';
import BrandLogo from '@/components/BrandLogo';
import FAQ from '@/components/FAQ';
import FightNightLanding from '@/components/FightNightLanding';
import { LANDING_FUNNEL_WIDTH } from '@/components/LandingFunnel';
import LandingFunnel from '@/components/LandingFunnel';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PageBackground from '@/components/PageBackground';
import PaywallCard from '@/components/PaywallCard';
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
  const [previewExpired, setPreviewExpired] = useState(false);

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
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('ufc_preview_expired') === '1') {
      setPreviewExpired(true);
    }
  }, []);

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

  const scrollToSignup = useCallback((mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setMessage('');
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePreviewExpired = useCallback(() => {
    setPreviewExpired(true);
    scrollToSignup('signup');
  }, [scrollToSignup]);

  const isLoggedIn = !!session;
  const showAuthGate = !isLoggedIn || view === 'auth';
  const showHero = showAuthGate || view === 'pay' || view === 'success';
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

      {showHero && !showAuthGate && (
        <FightNightLanding
          journeyStep={journeyStep}
          hideSignupCta
          onCreateAccount={() => scrollToSignup('signup')}
          onSignIn={() => scrollToSignup('login')}
        />
      )}

      <main
        className={`relative mx-auto px-4 sm:px-6 ${
          showAuthGate
            ? 'max-w-6xl pb-10 pt-[5.25rem] sm:pt-28'
            : showHero
              ? 'max-w-6xl pb-10'
              : view === 'stream'
                ? 'max-w-6xl pb-6 pt-24 sm:pt-28'
                : 'max-w-6xl pb-10 pt-24 sm:pb-20 sm:pt-28'
        }`}
      >
        {showAuthGate && (
          <LandingFunnel
            authMode={authMode}
            email={email}
            password={password}
            message={message}
            busy={busy}
            loading={view === 'loading' && !isLoggedIn}
            previewExpired={previewExpired}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onAuthModeToggle={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setMessage('');
            }}
            onForgotPassword={handleForgotPassword}
            onSubmit={handleAuth}
            onUnlock={() => scrollToSignup('signup')}
            onPreviewExpired={handlePreviewExpired}
          />
        )}

        {view === 'loading' && isLoggedIn && <LoadingSkeleton />}

        {view === 'pay' && isLoggedIn && (
          <div className={`${LANDING_FUNNEL_WIDTH} space-y-6`}>
            <PaywallCard
              email={session?.user.email}
              message={message}
              busy={busy}
              onCheckout={handleCheckout}
            />
            <FAQ />
          </div>
        )}

        {view === 'success' && isLoggedIn && (
          <div className={`${LANDING_FUNNEL_WIDTH} relative z-20`}>
            <SuccessScreen
              email={session?.user.email}
              purchaseJustCompleted={purchaseJustCompleted}
              busy={busy}
              onWatch={handleWatchStream}
            />
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
