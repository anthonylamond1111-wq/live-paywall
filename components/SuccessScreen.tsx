'use client';

import { useEffect } from 'react';
import { fireConfetti } from '@/lib/confetti';
import { downloadEventCalendar, getGoogleCalendarUrl } from '@/lib/calendar';
import { EVENT } from '@/lib/event';
import ShareButton from '@/components/ShareButton';

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
    }
  }, [purchaseJustCompleted]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10 sm:mb-8 sm:h-24 sm:w-24">
        <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="mb-2 inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-green-400">
        Access confirmed
      </div>

      <h2 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-4xl">
        {purchaseJustCompleted ? 'Purchase successful!' : "You're cleared to watch"}
      </h2>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 text-left sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-400">{EVENT.number}</p>
        <p className="mt-1 text-lg font-bold">
          {EVENT.fighter1} vs {EVENT.fighter2}
        </p>
        <p className="mt-1 text-sm text-gray-400">{EVENT.streamStartLabel}</p>
        <p className="mt-1 text-xs text-gray-600">{EVENT.venue}</p>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        {purchaseJustCompleted
          ? 'Your ticket is saved to your account. Add the event to your calendar, then join when you\'re ready.'
          : 'Your access is saved. Tap below to join the live stream.'}
      </p>

      <p className="mb-6 text-xs text-gray-600">{EVENT.replayMessage}</p>

      {email && <p className="mb-4 text-sm text-gray-500">Signed in as {email}</p>}

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={downloadEventCalendar}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-gray-300 transition hover:border-red-500"
        >
          Add to calendar (.ics)
        </button>
        <a
          href={getGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-gray-300 transition hover:border-red-500"
        >
          Google Calendar
        </a>
        <ShareButton />
      </div>

      <button
        type="button"
        onClick={onWatch}
        disabled={busy}
        className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
      >
        {busy ? 'Loading stream…' : 'Watch live stream'}
      </button>
    </div>
  );
}
