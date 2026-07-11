'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StreamPlayer from '@/components/StreamPlayer';
import StreamOffline, { useStreamSchedule } from '@/components/StreamOffline';
import { PREVIEW_SECONDS } from '@/lib/constants';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

const PREVIEW_START_KEY = 'ufc_preview_started_at';
const PREVIEW_EXPIRED_KEY = 'ufc_preview_expired';

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRemainingSeconds(duration: number) {
  if (typeof window === 'undefined') return duration;
  if (sessionStorage.getItem(PREVIEW_EXPIRED_KEY) === '1') return 0;

  const startedAt = sessionStorage.getItem(PREVIEW_START_KEY);
  if (!startedAt) return duration;

  const elapsed = Math.floor((Date.now() - Number(startedAt)) / 1000);
  return Math.max(0, duration - elapsed);
}

type PreviewStreamProps = {
  onPreviewExpired?: () => void;
};

export default function PreviewStream({ onPreviewExpired }: PreviewStreamProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(PREVIEW_SECONDS);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const previewStartedTracked = useRef(false);
  const { isBeforeStart } = useStreamSchedule();

  const handleLiveChange = useCallback((live: boolean) => {
    setIsLive(live);
    if (!live || typeof window === 'undefined') return;
    if (sessionStorage.getItem(PREVIEW_EXPIRED_KEY) === '1') return;
    if (!previewStartedTracked.current) {
      previewStartedTracked.current = true;
      trackAnalytics(AnalyticsEvents.PREVIEW_STARTED);
    }
    if (!sessionStorage.getItem(PREVIEW_START_KEY)) {
      sessionStorage.setItem(PREVIEW_START_KEY, String(Date.now()));
      setRemaining(PREVIEW_SECONDS);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      try {
        const res = await fetch('/api/preview');
        if (!res.ok) return;

        const { url, seconds } = await res.json();
        if (!active) return;

        const duration = typeof seconds === 'number' ? seconds : PREVIEW_SECONDS;
        const left = getRemainingSeconds(duration);

        if (left <= 0) {
          sessionStorage.setItem(PREVIEW_EXPIRED_KEY, '1');
          setExpired(true);
          setRemaining(0);
          return;
        }

        setPreviewUrl(url);
        setRemaining(left);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (expired || !previewUrl || !isLive) return;

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          sessionStorage.setItem(PREVIEW_EXPIRED_KEY, '1');
          setExpired(true);
          setPreviewUrl(null);
          trackAnalytics(AnalyticsEvents.PREVIEW_EXPIRED);
          onPreviewExpired?.();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expired, previewUrl, isLive, onPreviewExpired]);

  const urgent = remaining <= 15 && !expired && isLive;
  const previewActive = isLive && !expired;

  return (
    <div className="preview-frame group relative overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="preview-frame-inner">
        <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-zinc-900/95 via-zinc-900/80 to-zinc-900/95 px-4 py-3.5 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="preview-live-dot h-2 w-2 rounded-full bg-red-500" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Free preview
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              {previewActive
                ? '60 seconds free — see the live stream for yourself'
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

        <div className="relative bg-black">
          {loading && (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-950 to-black">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border border-red-500/20" />
              </div>
              <p className="text-sm text-gray-500">Loading preview…</p>
            </div>
          )}

          {!loading && previewUrl && !expired && (
            <>
              <StreamPlayer src={previewUrl} onLiveChange={handleLiveChange} />
              {!isLive && (
                <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl sm:rounded-3xl">
                  <StreamOffline
                    variant={isBeforeStart ? 'scheduled' : 'waiting'}
                    subtitle="The free preview will be available here when the broadcast begins."
                  />
                </div>
              )}
            </>
          )}

          {!loading && expired && (
            <div className="preview-ended flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-950 via-black to-black px-6 text-center">
              <div className="preview-lock-icon flex h-16 w-16 items-center justify-center rounded-full">
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
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
                  Create an account to unlock the official stream and live chat.
                </p>
              </div>
              <a
                href="#signup"
                className="mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100"
              >
                Create your account
              </a>
            </div>
          )}

          {previewActive && (
            <>
              <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-200 ring-1 ring-white/10 backdrop-blur-sm">
                Preview only
              </div>
              {urgent && (
                <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4">
                  <div className="rounded-full bg-red-600/95 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(220,38,38,0.5)]">
                    Preview ends in {formatCountdown(remaining)} — sign up to keep watching
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
