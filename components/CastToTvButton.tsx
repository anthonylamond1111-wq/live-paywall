'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import {
  detectCastMethod,
  isMobileDevice,
  promptCastToTv,
  type CastMethod,
} from '@/lib/cast-to-tv';

type CastToTvButtonProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  variant?: 'toolbar' | 'prominent' | 'player';
  className?: string;
};

function CastIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

export default function CastToTvButton({
  videoRef,
  variant = 'toolbar',
  className = '',
}: CastToTvButtonProps) {
  const [open, setOpen] = useState(false);
  const [castMethod, setCastMethod] = useState<CastMethod>('none');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => setCastMethod(detectCastMethod(video));
    update();

    video.addEventListener('loadedmetadata', update);
    video.addEventListener('canplay', update);

    return () => {
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('canplay', update);
    };
  }, [videoRef]);

  const openHelp = useCallback((hint?: string) => {
    setMessage(hint ?? '');
    setOpen(true);
  }, []);

  const handleCast = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      openHelp('Start the stream first, then try casting again.');
      return;
    }

    const result = await promptCastToTv(video);
    if (result === 'failed') {
      openHelp(
        isMobileDevice()
          ? 'Use the steps below — your browser may not show the cast picker for this stream.'
          : undefined
      );
    }
  }, [videoRef, openHelp]);

  const label =
    castMethod === 'airplay'
      ? 'AirPlay'
      : castMethod === 'remote'
        ? 'Cast to TV'
        : 'Watch on TV';

  const toolbarClass =
    'rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 sm:text-sm';

  const prominentClass =
    'flex w-full items-center justify-center gap-2 rounded-2xl border border-red-600/50 bg-zinc-900/90 py-3.5 text-sm font-semibold text-white transition hover:border-red-500 active:scale-[0.985]';

  const playerClass =
    'rounded-lg p-2 text-white transition hover:bg-white/10';

  const buttonClass =
    className ||
    (variant === 'prominent'
      ? prominentClass
      : variant === 'player'
        ? playerClass
        : toolbarClass);

  return (
    <>
      <button
        type="button"
        onClick={() => void handleCast()}
        className={buttonClass}
        aria-label={label}
      >
        {variant === 'player' ? (
          <CastIcon className="h-5 w-5" />
        ) : (
          <>
            <CastIcon className="inline h-4 w-4 sm:mr-1.5" />
            <span className={variant === 'toolbar' ? 'hidden sm:inline' : undefined}>{label}</span>
            {variant === 'toolbar' && (
              <span className="sm:hidden">{castMethod === 'airplay' ? 'AirPlay' : 'Cast'}</span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Watch on your TV</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {message && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {message}
              </p>
            )}

            <div className="mt-4 space-y-4 text-sm text-gray-400">
              <div>
                <p className="font-semibold text-white">iPhone / iPad (AirPlay)</p>
                <p className="mt-1">
                  Tap <strong className="text-gray-200">AirPlay</strong> above, or open Control Centre →
                  Screen Mirroring / AirPlay and pick your TV. Keep this page open while watching.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Android (Chromecast)</p>
                <p className="mt-1">
                  Tap <strong className="text-gray-200">Cast to TV</strong>, or in Chrome tap ⋮ → Cast →
                  select your Chromecast or smart TV.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Smart TV browser</p>
                <p className="mt-1">
                  Open the TV browser, go to ufcaccess.co.uk, log in, and press play on the stream.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
