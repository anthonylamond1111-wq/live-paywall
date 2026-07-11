'use client';

import { useEffect } from 'react';
import { fireConfetti } from '@/lib/confetti';
import { EVENT } from '@/lib/event';
import ShareButton from '@/components/ShareButton';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

type SuccessScreenProps = {
  email?: string | null;
  purchaseJustCompleted: boolean;
  busy: boolean;
  onWatch: () => void;
};

export default function SuccessScreen({
  email,
  purchaseJustCompleted,
  busy,
  onWatch,
}: SuccessScreenProps) {
  useEffect(() => {
    if (purchaseJustCompleted) {
      fireConfetti();
      trackAnalytics(AnalyticsEvents.PURCHASE);
    }
  }, [purchaseJustCompleted]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500/40 bg-black/50 shadow-lg backdrop-blur-sm sm:mb-8 sm:h-24 sm:w-24">
        <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="mb-2 inline-block rounded-full border border-green-500/30 bg-black/50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-green-400 shadow-lg backdrop-blur-sm">
        Access confirmed
      </div>

      <h2 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-4xl">
        {purchaseJustCompleted ? 'Purchase successful!' : "You're cleared to watch"}
      </h2>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 text-left sm:mb-8">
        <p className="text-lg font-bold">{EVENT.number}</p>
        <p className="mt-1 text-sm text-gray-400">{EVENT.streamStartLabel}</p>
        <p className="mt-1 text-xs text-gray-600">{EVENT.venue}</p>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        {purchaseJustCompleted
          ? 'Your ticket is saved to your account. Join when you\'re ready.'
          : 'Your access is saved. Tap below to join the live stream.'}
      </p>

      <p className="mb-6 text-xs text-gray-600">{EVENT.replayMessage}</p>

      {email && <p className="mb-6 text-sm text-gray-500">Signed in as {email}</p>}

      <button
        type="button"
        onClick={onWatch}
        disabled={busy}
        className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
      >
        {busy ? 'Loading stream…' : 'Watch live stream'}
      </button>

      <div className="mt-4 flex justify-center">
        <ShareButton variant="promo" />
      </div>
    </div>
  );
}
