'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import BrandIntro from '@/components/BrandIntro';
import BrandLogo from '@/components/BrandLogo';
import DiscordHelpLink from '@/components/DiscordHelpLink';
import GuestLanding, { LANDING_FUNNEL_WIDTH } from '@/components/GuestLanding';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PageBackground from '@/components/PageBackground';
import SiteFooter from '@/components/SiteFooter';
import StreamView from '@/components/StreamView';
import VisitorHeartbeat from '@/components/VisitorHeartbeat';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isSiteAdmin } from '@/lib/site-admin';

type View = 'loading' | 'landing' | 'stream';

export default function UFCAccess() {
  const [view, setView] = useState<View>('loading');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [previewExpired, setPreviewExpired] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('ufc_preview_expired') === '1';
  });
  const [previewLive, setPreviewLive] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const loadStream = useCallback(async () => {
    const res = await fetch('/api/stream', { credentials: 'include' });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };

    if (!res.ok || !data.url) {
      if (res.status === 402) {
        setView('landing');
        return false;
      }
      setMessage(data.error ?? 'Could not load the stream.');
      setView('landing');
      return false;
    }

    setStreamUrl(data.url);
    setView('stream');
    return true;
  }, []);

  const checkAccess = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');

    if (canceled) {
      setMessage('Payment canceled. Tap pay when you’re ready.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (sessionId) {
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const verified = await verifyRes.json().catch(() => ({}));

      if (verifyRes.ok && verified.paid) {
        window.history.replaceState({}, '', window.location.pathname);
        trackAnalytics(AnalyticsEvents.PURCHASE);
        await loadStream();
        return;
      }

      if (verified.status && verified.status !== 'paid') {
        setMessage('Payment is still processing. Refresh in a minute.');
        setView('landing');
        return;
      }

      setMessage('Payment could not be verified. Try Restore access with your email.');
    }

    const accessRes = await fetch('/api/access', { credentials: 'include' });
    const access = await accessRes.json().catch(() => ({}));

    if (accessRes.ok && access.paid) {
      await loadStream();
      return;
    }

    setView('landing');
  }, [loadStream]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const mail = data.session?.user.email ?? null;
      setOwnerEmail(isSiteAdmin(mail) ? mail : null);
    });
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!email.trim()) {
      document.getElementById('pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMessage('Enter your email so we can save access on this device.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          promotionCode: promotionCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.alreadyPaid) {
        setMessage('This device already has access.');
        await loadStream();
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
  }, [email, promotionCode, loadStream]);

  const handleRestored = useCallback(async () => {
    setMessage('');
    await loadStream();
  }, [loadStream]);

  const handlePreviewExpired = useCallback(() => {
    setPreviewExpired(true);
    document.getElementById('pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-black text-white">
      <VisitorHeartbeat
        view={view === 'stream' ? 'stream' : 'site'}
        active={view !== 'loading'}
      />
      <BrandIntro />
      <PageBackground showPoster={view !== 'stream'} />
      <AddToHomeScreen />

      <nav className="fixed top-0 z-50 w-full border-b border-red-600/80 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
          <BrandLogo />
          <div className="flex items-center gap-3 sm:gap-6">
            {view === 'stream' && (
              <div className="live-badge hidden items-center gap-2 sm:flex">
                <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-mono tracking-widest text-red-500 sm:text-sm">
                  LIVE ACCESS
                </span>
              </div>
            )}
            {ownerEmail && (
              <Link
                href="/admin"
                className="text-[10px] font-medium text-red-400/90 transition hover:text-red-300 sm:text-xs"
              >
                Stats
              </Link>
            )}
            <DiscordHelpLink compact className="hidden sm:inline-flex" />
          </div>
        </div>
      </nav>

      <main
        className={`relative mx-auto px-4 sm:px-6 ${
          view === 'stream'
            ? 'max-w-6xl pb-6 pt-24 sm:pt-28'
            : 'max-w-6xl pb-10 pt-[5.25rem] sm:pt-28'
        }`}
      >
        {view === 'loading' && <LoadingSkeleton />}

        {view === 'landing' && (
          <GuestLanding
            email={email}
            message={message}
            busy={busy}
            previewExpired={previewExpired}
            previewLive={previewLive}
            promotionCode={promotionCode}
            onEmailChange={setEmail}
            onPromotionCodeChange={setPromotionCode}
            onUnlock={() => void handleCheckout()}
            onPreviewExpired={handlePreviewExpired}
            onPreviewLiveChange={setPreviewLive}
            onRestored={() => void handleRestored()}
          />
        )}

        {view === 'stream' && streamUrl && <StreamView streamUrl={streamUrl} />}

        {view !== 'stream' && (
          <div className={view === 'landing' ? '' : LANDING_FUNNEL_WIDTH}>
            <SiteFooter />
          </div>
        )}
      </main>
    </div>
  );
}
