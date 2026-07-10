'use client';

import { useEffect, useState } from 'react';
import StreamPlayer from '@/components/StreamPlayer';
import StreamOffline, { useStreamSchedule } from '@/components/StreamOffline';
import { PREVIEW_SECONDS } from '@/lib/constants';

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

export default function PreviewStream() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(PREVIEW_SECONDS);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isBeforeStart } = useStreamSchedule();

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

        if (!sessionStorage.getItem(PREVIEW_START_KEY)) {
          sessionStorage.setItem(PREVIEW_START_KEY, String(Date.now()));
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
    if (expired || !previewUrl) return;

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          sessionStorage.setItem(PREVIEW_EXPIRED_KEY, '1');
          setExpired(true);
          setPreviewUrl(null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expired, previewUrl]);

  const urgent = remaining <= 15 && !expired;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-600/50 bg-zinc-900/90 shadow-lg shadow-red-900/10 sm:rounded-3xl">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Free preview
          </p>
          <p className="text-sm text-gray-400">
            {isBeforeStart
              ? 'Preview available when the stream goes live'
              : "Sample of tonight's live broadcast"}
          </p>
        </div>
        {!expired && !loading && (
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-mono font-semibold ${
              urgent
                ? 'animate-pulse bg-red-500/20 text-red-300 ring-1 ring-red-500/50'
                : 'bg-red-500/10 text-red-300'
            }`}
          >
            {formatCountdown(remaining)} left
          </div>
        )}
      </div>

      <div className="relative">
        {loading && (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading preview…</p>
          </div>
        )}

        {!loading && isBeforeStart && !expired && (
          <StreamOffline
            variant="scheduled"
            subtitle="The free preview will be available here when the broadcast begins."
          />
        )}

        {!loading && previewUrl && !expired && !isBeforeStart && <StreamPlayer src={previewUrl} />}

        {!loading && expired && (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white">Preview ended</p>
            <p className="max-w-sm text-sm text-gray-400">
              Create an account below to unlock the official stream and live chat.
            </p>
          </div>
        )}

        {!loading && !expired && previewUrl && !isBeforeStart && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-300 backdrop-blur-sm">
              Preview only
            </div>
            {urgent && (
              <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center">
                <div className="rounded-full bg-red-600/90 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                  Preview ends in {formatCountdown(remaining)} — sign up to keep watching
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
