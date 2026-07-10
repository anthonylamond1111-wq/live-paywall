'use client';

import { useEffect, useState } from 'react';
import { EVENT, getEventCountdown } from '@/lib/event';

export type StreamOfflineVariant = 'scheduled' | 'waiting';

type StreamOfflineProps = {
  variant: StreamOfflineVariant;
  fill?: boolean;
  subtitle?: string;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function useStreamSchedule() {
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(getEventCountdown());

  useEffect(() => {
    const tick = () => {
      setCountdown(getEventCountdown());
      setStarted(!getEventCountdown().isBeforeEvent);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return { started, countdown, isBeforeStart: countdown.isBeforeEvent };
}

export default function StreamOffline({ variant, fill = false, subtitle }: StreamOfflineProps) {
  const { countdown } = useStreamSchedule();

  const title =
    variant === 'scheduled'
      ? 'Stream has not started yet'
      : 'Broadcast not live yet';

  const message =
    subtitle ??
    (variant === 'scheduled'
      ? `We're live at ${EVENT.streamStartLabel}. Come back then — your access is already unlocked.`
      : 'The stream has not gone live yet. Keep this page open and it will connect automatically when broadcasting begins.');

  return (
    <div
      className={`flex w-full flex-col items-center justify-center bg-black px-6 text-center ${
        fill ? 'h-full min-h-0' : 'aspect-video rounded-2xl border-2 border-red-600/40 sm:rounded-3xl'
      }`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
        <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>

      <p className="text-lg font-semibold text-white sm:text-xl">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">{message}</p>

      {variant === 'scheduled' && countdown.isBeforeEvent && (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400">
            Stream starts in
          </p>
          <div className="flex items-center justify-center gap-2 font-mono text-2xl font-bold text-white sm:gap-3 sm:text-3xl">
            {countdown.days > 0 && (
              <>
                <span>{pad(countdown.days)}d</span>
                <span className="text-red-500/50">:</span>
              </>
            )}
            <span>{pad(countdown.hours)}h</span>
            <span className="text-red-500/50">:</span>
            <span>{pad(countdown.minutes)}m</span>
            <span className="text-red-500/50">:</span>
            <span>{pad(countdown.seconds)}s</span>
          </div>
          <p className="mt-3 text-xs text-gray-600">{EVENT.streamStartLabel}</p>
        </div>
      )}

      {variant === 'waiting' && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          Waiting for signal…
        </div>
      )}
    </div>
  );
}
