'use client';

import type { FormEvent } from 'react';
import EventCountdown from '@/components/EventCountdown';
import FAQ from '@/components/FAQ';
import FreeVsPaid from '@/components/FreeVsPaid';
import JourneyProgress from '@/components/JourneyProgress';
import LiveUpdateBanner from '@/components/LiveUpdateBanner';
import NotifyWhenLive from '@/components/NotifyWhenLive';
import PreviewConversion from '@/components/PreviewConversion';
import PreviewStream from '@/components/PreviewStream';
import ShareButton from '@/components/ShareButton';
import StickyUnlockCta from '@/components/StickyUnlockCta';
import { EVENT } from '@/lib/event';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

export const LANDING_FUNNEL_WIDTH =
  'mx-auto w-full max-w-2xl xl:max-w-3xl';

type LandingFunnelProps = {
  authMode: 'login' | 'signup';
  email: string;
  password: string;
  message: string;
  busy: boolean;
  previewExpired: boolean;
  previewLive: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAuthModeToggle: () => void;
  onForgotPassword: () => void;
  onSubmit: (e: FormEvent) => void;
  onUnlock: () => void;
  onPreviewExpired: () => void;
  onPreviewLiveChange: (live: boolean) => void;
};

export default function LandingFunnel({
  authMode,
  email,
  password,
  message,
  busy,
  previewExpired,
  previewLive,
  onEmailChange,
  onPasswordChange,
  onAuthModeToggle,
  onForgotPassword,
  onSubmit,
  onUnlock,
  onPreviewExpired,
  onPreviewLiveChange,
}: LandingFunnelProps) {
  const handleUnlock = () => {
    trackAnalytics(AnalyticsEvents.UNLOCK_CLICK, {
      source: previewExpired ? 'expired' : previewLive ? 'live' : 'funnel',
    });
    onUnlock();
  };

  const handleSubmit = (e: FormEvent) => {
    trackAnalytics(AnalyticsEvents.SIGNUP_SUBMIT, { mode: authMode });
    onSubmit(e);
  };

  return (
    <>
      <div className={`${LANDING_FUNNEL_WIDTH} space-y-5 pb-20 sm:space-y-6`}>
        <header className="border-b border-red-600/20 pb-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
            {EVENT.number} • {EVENT.tagline}
          </p>
          <h1 className="fight-hero-name mt-2 text-3xl text-white sm:text-4xl">
            {EVENT.fighter1}
            <span className="mx-2 text-lg font-bold text-red-500 sm:text-xl">VS</span>
            {EVENT.fighter2}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">{EVENT.venue}</p>
        </header>

        <EventCountdown />

        <p className="text-center text-sm text-gray-400">
          Free 60-second preview — then pay once to keep watching
        </p>
        <div className="flex justify-center">
          <ShareButton
            variant="promo"
            className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 hover:text-white sm:text-sm"
          />
        </div>

        <JourneyProgress current="preview" onDark />

        <LiveUpdateBanner />

        <PreviewStream
          onPreviewExpired={onPreviewExpired}
          onPreviewLiveChange={onPreviewLiveChange}
          onUnlock={handleUnlock}
        />

        <PreviewConversion
          variant={previewExpired ? 'expired' : 'default'}
          email={email}
          onEmailChange={onEmailChange}
          message={message}
          busy={busy}
          onUnlock={handleUnlock}
        />

        <div
          id="signup"
          className="scroll-mt-28 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:rounded-3xl sm:p-8"
        >
          <h2 className="mb-2 text-center text-lg font-semibold text-gray-200">
            {authMode === 'login' ? 'Log in' : 'Create password to watch'}
          </h2>
          <p className="mb-5 text-center text-sm text-gray-500">
            Already paid? Use the same email from checkout and choose a password below. Or pay with email only above — no password needed.
          </p>

          {message && <p className="mb-4 text-center text-sm text-red-400">{message}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none transition focus:border-red-500"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none transition focus:border-red-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl border border-zinc-600 bg-transparent py-3.5 text-base font-medium text-white transition hover:border-zinc-400 disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Log in'
                  : 'Create password & watch'}
            </button>
          </form>

          <button
            type="button"
            onClick={onAuthModeToggle}
            className="mt-4 w-full text-sm text-gray-500 underline transition hover:text-white"
          >
            {authMode === 'login'
              ? 'Need an account? Sign up'
              : 'Already have an account? Log in'}
          </button>

          {authMode === 'login' && (
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={busy}
              className="mt-2 w-full text-sm text-gray-600 underline transition hover:text-red-400"
            >
              Forgot password?
            </button>
          )}
        </div>

        <NotifyWhenLive />
        <FreeVsPaid />
        <FAQ />
      </div>

      <StickyUnlockCta
        visible={previewExpired || previewLive}
        onUnlock={handleUnlock}
        busy={busy}
      />
    </>
  );
}
