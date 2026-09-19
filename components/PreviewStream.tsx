'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StreamPlayer, { useStreamFullscreen } from '@/components/StreamPlayer';
import StreamConnecting from '@/components/StreamConnecting';
import StreamOffline, { useStreamSchedule } from '@/components/StreamOffline';
import { formatPreviewDuration, PREVIEW_SECONDS, CHECKOUT_LABEL } from '@/lib/constants';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

const PREVIEW_START_KEY = 'ufc_preview_started_at';
const PREVIEW_EXPIRED_KEY = 'ufc_preview_expired';

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

type PreviewStreamProps = {
  onPreviewExpired?: () => void;
  onPreviewLiveChange?: (live: boolean) => void;
  onUnlock?: () => void;
};

export default function PreviewStream({
  onPreviewExpired,
  onPreviewLiveChange,
  onUnlock,
}: PreviewStreamProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(PREVIEW_SECONDS);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [connectTimedOut, setConnectTimedOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewStartedRef = useRef(false);
  const expiredTrackedRef = useRef(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { enter: enterNativeFullscreen, exit: exitNativeFullscreen } =
    useStreamFullscreen(fullscreenRef, videoRef);

  const markExpired = useCallback(
    (track = true) => {
      sessionStorage.setItem(PREVIEW_EXPIRED_KEY, '1');
      setExpired(true);
      setRemaining(0);
      setPreviewUrl(null);
      setCountdownActive(false);
      if (track && !expiredTrackedRef.current) {
        expiredTrackedRef.current = true;
        trackAnalytics(AnalyticsEvents.PREVIEW_EXPIRED);
        onPreviewExpired?.();
      }
    },
    [onPreviewExpired]
  );

  const handleLiveChange = useCallback(
    (live: boolean) => {
      setIsLive(live);
      onPreviewLiveChange?.(live);
    },
    [onPreviewLiveChange]
  );

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      try {
        if (sessionStorage.getItem(PREVIEW_EXPIRED_KEY) === '1') {
          markExpired(false);
          return;
        }

        const res = await fetch('/api/preview', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok) {
          setLoadError(data.error ?? 'Preview unavailable right now.');
          return;
        }

        const { url, seconds, started, expired: alreadyExpired } = data as {
          url?: string;
          seconds?: number;
          started?: boolean;
          expired?: boolean;
        };
        const left = typeof seconds === 'number' ? seconds : PREVIEW_SECONDS;

        if (alreadyExpired || left <= 0) {
          markExpired(false);
          return;
        }

        if (url) setPreviewUrl(url);

        if (started) {
          previewStartedRef.current = true;
          setCountdownActive(true);
          const startedAt = Date.now() - (PREVIEW_SECONDS - left) * 1000;
          sessionStorage.setItem(PREVIEW_START_KEY, String(startedAt));
          if (!sessionStorage.getItem(PREVIEW_START_KEY + '_tracked')) {
            sessionStorage.setItem(PREVIEW_START_KEY + '_tracked', '1');
            trackAnalytics(AnalyticsEvents.PREVIEW_STARTED);
          }
        }

        setRemaining(left);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [markExpired]);

  const { isBeforeStart } = useStreamSchedule();

  useEffect(() => {
    if (isLive || !previewUrl) {
      setConnectTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setConnectTimedOut(true), 20_000);
    return () => window.clearTimeout(timer);
  }, [isLive, previewUrl]);

  // Wall-clock countdown from server start — survives tab sleep / laggy intervals.
  useEffect(() => {
    if (expired || !countdownActive) return;

    const startedRaw = sessionStorage.getItem(PREVIEW_START_KEY);
    const startedAt = startedRaw ? Number(startedRaw) : NaN;
    if (!Number.isFinite(startedAt)) return;

    const tick = () => {
      const left = Math.max(
        0,
        PREVIEW_SECONDS - Math.floor((Date.now() - startedAt) / 1000)
      );
      setRemaining(left);
      if (left <= 0) {
        markExpired(true);
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [expired, countdownActive, markExpired]);

  const urgent = remaining <= 15 && !expired && countdownActive;
  const previewActive = isLive && !expired && countdownActive;

  const handleEnterFullscreen = async () => {
    const preferVideo =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;
    const entered = await enterNativeFullscreen(preferVideo);
    if (!entered || !preferVideo) {
      setIsFullscreen(true);
    }
  };

  const handleExitFullscreen = async () => {
    await exitNativeFullscreen();
    setIsFullscreen(false);
  };

  const handleFullscreenToggle = () => {
    if (isFullscreen) {
      void handleExitFullscreen();
    } else {
      void handleEnterFullscreen();
    }
  };

  useEffect(() => {
    if (!isFullscreen) return;

    document.body.style.overflow = 'hidden';

    const onFullscreenChange = () => {
      const webkitVideo = videoRef.current as HTMLVideoElement & {
        webkitDisplayingFullscreen?: boolean;
      } | null;
      if (!document.fullscreenElement && !webkitVideo?.webkitDisplayingFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    const video = videoRef.current;
    video?.addEventListener('webkitbeginfullscreen', onFullscreenChange);
    video?.addEventListener('webkitendfullscreen', onFullscreenChange);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      video?.removeEventListener('webkitbeginfullscreen', onFullscreenChange);
      video?.removeEventListener('webkitendfullscreen', onFullscreenChange);
    };
  }, [isFullscreen]);

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col bg-black'
          : 'group relative'
      }
    >
      {!isFullscreen && (
      <div className="mb-3 flex items-center justify-between px-1 sm:mb-4 sm:px-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="preview-live-dot h-2 w-2 rounded-full bg-red-500" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              {expired ? 'Preview locked' : 'Free preview'}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {expired
              ? 'Free preview over — pay to keep watching'
              : previewActive
                ? `${formatPreviewDuration(true)} free — see the live stream for yourself`
                : 'Free preview starts when the broadcast goes live'}
          </p>
        </div>
        {previewActive && !loading && (
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-mono font-semibold tabular-nums ${
              urgent
                ? 'animate-pulse bg-red-500/25 text-red-200 ring-1 ring-red-500/60'
                : 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20'
            }`}
          >
            {formatCountdown(remaining)} left
          </div>
        )}
      </div>
      )}

      {isFullscreen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-[max(0.75rem,env(safe-area-inset-top))_1rem_2rem]">
          <div className="pointer-events-auto rounded-md bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-200 ring-1 ring-white/10 backdrop-blur-sm">
            {expired ? 'Preview locked' : 'Free preview'}
            {previewActive && (
              <span className="ml-2 font-mono text-red-300">{formatCountdown(remaining)} left</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleExitFullscreen}
            className="pointer-events-auto rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:text-sm"
          >
            Minimize
          </button>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? 'relative min-h-0 flex-1'
            : 'preview-frame relative overflow-hidden rounded-2xl sm:rounded-3xl'
        }
      >
        <div className={isFullscreen ? 'h-full' : 'preview-frame-inner'}>
        <div className={`relative bg-black ${isFullscreen ? 'h-full min-h-0' : ''}`}>
          {loading && (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-950 to-black">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border border-red-500/20" />
              </div>
              <p className="text-sm text-gray-500">Loading preview…</p>
            </div>
          )}

          {!loading && loadError && !previewUrl && (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-950 to-black px-6 text-center">
              <p className="text-lg font-semibold text-white">Preview unavailable</p>
              <p className="text-sm text-gray-400">{loadError}</p>
            </div>
          )}

          {!loading && previewUrl && !expired && (
            <>
              <StreamPlayer
                src={previewUrl}
                fill={isFullscreen}
                videoRef={videoRef}
                isFullscreen={isFullscreen}
                onFullscreenToggle={handleFullscreenToggle}
                onLiveChange={handleLiveChange}
                showCastButton={false}
              />
              {!isLive && (
                <div
                  className={`absolute inset-0 z-10 overflow-hidden ${
                    isFullscreen ? 'rounded-none' : 'rounded-2xl sm:rounded-3xl'
                  }`}
                >
                  {connectTimedOut ? (
                    <StreamOffline
                      variant={isBeforeStart ? 'scheduled' : 'waiting'}
                      subtitle="The free preview will be available here when the broadcast begins."
                    />
                  ) : (
                    <StreamConnecting />
                  )}
                </div>
              )}
            </>
          )}

          {!loading && expired && (
            <div
              className={`preview-ended relative flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-950 to-black px-6 text-center ${
                isFullscreen ? 'h-full min-h-0 aspect-auto' : ''
              }`}
            >
              <div className="preview-lock-icon preview-lock-pulse flex h-16 w-16 items-center justify-center rounded-full">
                <svg className="h-8 w-8 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-white sm:text-2xl">Preview ended</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-200">
                  Free preview is over. Pay once for clear HD and full audio on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={onUnlock}
                className="pay-cta-btn mt-1 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black shadow-[0_0_32px_rgba(255,255,255,0.25)] transition hover:bg-gray-100 active:scale-[0.98]"
              >
                {CHECKOUT_LABEL} · Watch clear
              </button>
            </div>
          )}

          {previewActive && !isFullscreen && (
            <>
              <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-200 ring-1 ring-white/10 backdrop-blur-sm">
                Preview only
              </div>
              {urgent && (
                <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4">
                  <div className="rounded-full bg-red-600/95 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(220,38,38,0.5)]">
                    Preview ends in {formatCountdown(remaining)} — pay to keep watching clear
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
