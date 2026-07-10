'use client';

import { useEffect, useState } from 'react';
import StreamPlayer from '@/components/StreamPlayer';
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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-600/50 bg-zinc-900 sm:rounded-3xl">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Free preview
          </p>
          <p className="text-sm text-gray-400">Sample of tonight&apos;s live broadcast</p>
        </div>
        {!expired && !loading && (
          <div className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300">
            {formatCountdown(remaining)}
          </div>
        )}
      </div>

      <div className="relative">
        {loading && (
          <div className="flex aspect-video items-center justify-center bg-black text-sm text-gray-500">
            Loading preview…
          </div>
        )}

        {!loading && previewUrl && !expired && <StreamPlayer src={previewUrl} />}

        {!loading && expired && (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black px-6 text-center">
            <div className="text-3xl">🔒</div>
            <p className="text-lg font-semibold text-white">Preview ended</p>
            <p className="max-w-sm text-sm text-gray-400">
              Create an account below to unlock the official stream and live chat.
            </p>
          </div>
        )}

        {!loading && !expired && previewUrl && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-300">
            Preview only
          </div>
        )}
      </div>
    </div>
  );
}
