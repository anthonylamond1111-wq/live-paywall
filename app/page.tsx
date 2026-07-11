'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import BrandIntro from '@/components/BrandIntro';
import BrandLogo from '@/components/BrandLogo';
import DiscordHelpLink from '@/components/DiscordHelpLink';
import FAQ from '@/components/FAQ';
import EventCountdown from '@/components/EventCountdown';
import FightNightLanding from '@/components/FightNightLanding';
import { LANDING_FUNNEL_WIDTH } from '@/components/LandingFunnel';
import LandingFunnel from '@/components/LandingFunnel';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PageBackground from '@/components/PageBackground';
import PaywallCard from '@/components/PaywallCard';
import PreviewConversion from '@/components/PreviewConversion';
import PreviewStream from '@/components/PreviewStream';
import SiteFooter from '@/components/SiteFooter';
import StickyUnlockCta from '@/components/StickyUnlockCta';
import StreamView from '@/components/StreamView';
import SuccessScreen from '@/components/SuccessScreen';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

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

type VerifyResult = {
  paid: boolean;
  status?: string;
  access_token?: string;
  refresh_token?: string;
};

async function verifyCheckoutSession(
  stripeSessionId: string,
  activeSession: Session | null
): Promise<VerifyResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (activeSession) {
    headers.Authorization = `Bearer ${activeSession.access_token}`;
  }

  const res = await fetch('/api/verify', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ sessionId: stripeSessionId }),
  });

  const data = (await res.json().catch(() => ({}))) as VerifyResult & { error?: string };
  if (!res.ok) {
    return { paid: false, status: data.status };
  }

  return data;
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
  const [previewExpired, setPreviewExpired] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('ufc_preview_expired') === '1';
  });
  const [previewLive, setPreviewLive] = useState(false);

  const unlockStream = useCallback(async (activeSession: Session) => {
    const streamRes = await authFetch(activeSession, '/api/stream');
    if (!streamRes.ok) {
      const data = (await streamRes.json().catch(() => ({}))) as { error?: string };
      if (streamRes.status === 402) {
        setMessage('Payment required to watch the stream.');
        setView('pay');
      } else if (streamRes.status === 401) {
        setMessage('Your session expired. Please log in again.');
        setView('auth');
      } else {
        setMessage(data.error ?? 'Could not load the stream. Refresh and try again.');
        setView('success');
      }
      return false;
    }

    const { url } = await streamRes.json();
    setStreamUrl(url);
    setView('stream');
    return true;
  }, []);

  const enterStreamIfPaid = useCallback(
    async (activeSession: Session, justPurchased = false) => {
      if (justPurchased) {
        setPurchaseJustCompleted(true);
        trackAnalytics(AnalyticsEvents.PURCHASE);
      }
      const unlocked = await unlockStream(activeSession);
      if (!unlocked) {
        setView('success');
      }
    },
    [unlockStream]
  );

  const checkAccess = useCallback(
    async (activeSession: Session, options?: { skipStripeReturn?: boolean }) => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const canceled = params.get('canceled');

      if (canceled) {
        setMessage('Payment canceled. Tap Pay & watch to try again.');
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (sessionId && !options?.skipStripeReturn) {
        const verified = await verifyCheckoutSession(sessionId, activeSession);

        if (verified.access_token && verified.refresh_token) {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.setSession({
              access_token: verified.access_token,
              refresh_token: verified.refresh_token,
            });
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              setSession(data.session);
              window.history.replaceState({}, '', window.location.pathname);
              if (verified.paid) {
                await enterStreamIfPaid(data.session, true);
                return;
              }
            }
          }
        }

        if (verified.paid) {
          window.history.replaceState({}, '', window.location.pathname);
          await enterStreamIfPaid(activeSession, true);
          return;
        }

        if (verified.status && verified.status !== 'paid') {
          setMessage('Payment is still processing. Refresh in a minute.');
          setView('pay');
          return;
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
        await enterStreamIfPaid(activeSession);
        return;
      }

      setView('pay');
      setMessage('');
    },
    [enterStreamIfPaid]
  );

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Sign-in is not configured. Contact support.');
      setView('auth');
      return;
    }

    let mounted = true;

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const stripeSessionId = params.get('session_id');

      let current = (await supabase.auth.getSession()).data.session;

      if (stripeSessionId) {
        const verified = await verifyCheckoutSession(stripeSessionId, current);

        if (verified.access_token && verified.refresh_token) {
          await supabase.auth.setSession({
            access_token: verified.access_token,
            refresh_token: verified.refresh_token,
          });
          current = (await supabase.auth.getSession()).data.session;
        }

        if (!mounted) return;

        if (current && verified.paid) {
          setSession(current);
          window.history.replaceState({}, '', window.location.pathname);
          await enterStreamIfPaid(current, true);
          return;
        }

        if (verified.paid && current) {
          setSession(current);
          window.history.replaceState({}, '', window.location.pathname);
          await enterStreamIfPaid(current, true);
          return;
        }
      }

      if (!mounted) return;

      setSession(current);

      if (current) {
        await checkAccess(current, { skipStripeReturn: Boolean(stripeSessionId) });
      } else if (params.get('canceled')) {
        setMessage('Payment canceled. Tap Pay & watch to try again.');
        window.history.replaceState({}, '', window.location.pathname);
        setView('auth');
      } else {
        setView('auth');
      }
    };

    void init();

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
  }, [checkAccess, enterStreamIfPaid]);

  const handleCheckout = useCallback(async () => {
    const checkoutEmail = session?.user.email ?? email.trim();

    if (!session && !checkoutEmail) {
      document.getElementById('quick-pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMessage('Enter your email to continue to checkout.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(session ? {} : { email: checkoutEmail }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyPaid) {
        setMessage('You already have access for tonight.');
        if (session) await checkAccess(session);
        return;
      }

      if (!res.ok || !data.url) {
        setMessage(data.error ?? 'Could not start payment.');
        return;
      }

      trackAnalytics(AnalyticsEvents.CHECKOUT_START);
      window.location.href = data.url;
    } catch {
      setMessage('Payment could not be started.');
    } finally {
      setBusy(false);
    }
  }, [session, email, checkAccess]);

  const handleUnlock = useCallback(() => {
    void handleCheckout();
  }, [handleCheckout]);

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
        await fetch('/api/auth/confirm-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const signIn = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signIn.error || !signIn.data.session) {
          setMessage('Account created — log in with your email and password.');
          setAuthMode('login');
          return;
        }

        setSession(signIn.data.session);
        trackAnalytics(AnalyticsEvents.SIGNUP_SUCCESS);
        if (previewExpired) {
          await handleCheckout();
        } else {
          await checkAccess(signIn.data.session);
        }
        return;
      }

      const activeSession = result.data.session;
      if (activeSession) {
        setSession(activeSession);
        trackAnalytics(
          authMode === 'signup'
            ? AnalyticsEvents.SIGNUP_SUCCESS
            : AnalyticsEvents.LOGIN_SUCCESS
        );
        if (previewExpired) {
          await handleCheckout();
        } else {
          await checkAccess(activeSession);
        }
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
    void handleCheckout();
  }, [handleCheckout]);

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
            <DiscordHelpLink compact className="hidden sm:inline-flex" />
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
            previewExpired={previewExpired}
            previewLive={previewLive}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onAuthModeToggle={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setMessage('');
            }}
            onForgotPassword={handleForgotPassword}
            onSubmit={handleAuth}
            onUnlock={handleUnlock}
            onPreviewExpired={handlePreviewExpired}
            onPreviewLiveChange={setPreviewLive}
          />
        )}

        {view === 'loading' && isLoggedIn && <LoadingSkeleton />}

        {view === 'pay' && isLoggedIn && (
          <div className={`${LANDING_FUNNEL_WIDTH} space-y-5 pb-20 sm:space-y-6`}>
            <EventCountdown />
            <PreviewStream
              onPreviewExpired={() => setPreviewExpired(true)}
              onPreviewLiveChange={setPreviewLive}
              onUnlock={handleUnlock}
            />
            <PreviewConversion
              variant={previewExpired ? 'expired' : 'default'}
              onUnlock={handleUnlock}
            />
            <PaywallCard
              email={session?.user.email}
              message={message}
              busy={busy}
              onCheckout={handleCheckout}
            />
            <FAQ />
            <StickyUnlockCta
              visible={previewExpired || previewLive}
              onUnlock={handleUnlock}
              busy={busy}
            />
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
