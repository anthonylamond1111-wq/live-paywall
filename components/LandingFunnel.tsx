'use client';

import type { FormEvent } from 'react';
import EventCountdown from '@/components/EventCountdown';
import FAQ from '@/components/FAQ';
import FreeVsPaid from '@/components/FreeVsPaid';
import PreviewConversion from '@/components/PreviewConversion';
import PreviewStream from '@/components/PreviewStream';
import { EVENT } from '@/lib/event';

export const LANDING_FUNNEL_WIDTH =
  'mx-auto w-full max-w-2xl xl:max-w-3xl';

type LandingFunnelProps = {
  authMode: 'login' | 'signup';
  email: string;
  password: string;
  message: string;
  busy: boolean;
  loading: boolean;
  previewExpired: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAuthModeToggle: () => void;
  onForgotPassword: () => void;
  onSubmit: (e: FormEvent) => void;
  onUnlock: () => void;
  onPreviewExpired: () => void;
};

export default function LandingFunnel({
  authMode,
  email,
  password,
  message,
  busy,
  loading,
  previewExpired,
  onEmailChange,
  onPasswordChange,
  onAuthModeToggle,
  onForgotPassword,
  onSubmit,
  onUnlock,
  onPreviewExpired,
}: LandingFunnelProps) {
  return (
    <div className={`${LANDING_FUNNEL_WIDTH} space-y-5 sm:space-y-6`}>
      <header className="border-b border-red-600/20 pb-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
          {EVENT.number} • {EVENT.tagline}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Free 60-second preview — then unlock the full live stream
        </p>
      </header>

      <PreviewStream onPreviewExpired={onPreviewExpired} />

      <PreviewConversion
        variant={previewExpired ? 'expired' : 'default'}
        onUnlock={onUnlock}
      />

      <EventCountdown />
      <FreeVsPaid />

      <div
        id="signup"
        className="scroll-mt-28 rounded-2xl border border-red-600/50 bg-zinc-900/90 p-6 shadow-lg shadow-red-900/5 sm:rounded-3xl sm:p-8"
      >
        <h2 className="mb-2 text-center text-2xl font-bold">
          {authMode === 'login' ? 'Log in' : 'Create your account'}
        </h2>
        <p className="mb-6 text-center text-sm text-gray-400">
          {previewExpired
            ? 'Your preview ended — sign up and pay once to unlock the full live stream and chat.'
            : 'Create a free account to continue after your preview. Pay once for full access tonight.'}
        </p>

        {message && <p className="mb-4 text-center text-sm text-red-400">{message}</p>}

        {loading && (
          <p className="mb-4 text-center text-sm text-gray-400">Loading…</p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
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
            disabled={busy || loading}
            className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
          >
            {busy
              ? 'Please wait…'
              : authMode === 'login'
                ? 'Log in'
                : 'Create account & continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={onAuthModeToggle}
          className="mt-4 w-full text-sm text-gray-400 underline transition hover:text-white"
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
            className="mt-2 w-full text-sm text-gray-500 underline transition hover:text-red-400"
          >
            Forgot password?
          </button>
        )}
      </div>

      <FAQ />
    </div>
  );
}
