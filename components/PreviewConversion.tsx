'use client';

import { CHECKOUT_LABEL } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import PaymentBadges from '@/components/PaymentBadges';
import ShareButton from '@/components/ShareButton';
import SocialProof from '@/components/SocialProof';

type PreviewConversionProps = {
  onUnlock: () => void;
  variant?: 'default' | 'expired';
  email?: string;
  onEmailChange?: (value: string) => void;
  message?: string;
  busy?: boolean;
};

const TRUST_POINTS = [
  'Real live HD stream',
  'Secure Stripe checkout',
  'Works on phone & TV',
  'Instant access after payment',
];

export default function PreviewConversion({
  onUnlock,
  variant = 'default',
  email = '',
  onEmailChange,
  message,
  busy = false,
}: PreviewConversionProps) {
  const showEmailField = Boolean(onEmailChange);

  return (
    <div className="rounded-2xl border border-red-600/40 bg-gradient-to-b from-zinc-900/95 to-black p-5 sm:rounded-3xl sm:p-6">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
          {EVENT.number}
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
          {variant === 'expired'
            ? 'Like what you saw? Unlock the full fight.'
            : 'Watch free first — then unlock the full stream'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {variant === 'expired'
            ? 'Your 60-second preview ended. Pay once to keep watching live with chat.'
            : 'Try 60 seconds of the live broadcast for free. Pay only when you\'re ready for the full event.'}
        </p>
        <p className="mt-3 text-lg font-semibold text-white">{CHECKOUT_LABEL}</p>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {TRUST_POINTS.map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-green-400">✓</span>
            {point}
          </li>
        ))}
      </ul>

      {showEmailField && (
        <div id="checkout-email" className="mt-5 scroll-mt-28">
          <label htmlFor="checkout-email-input" className="mb-2 block text-center text-sm text-gray-400">
            Your email for checkout — no account needed
          </label>
          <input
            id="checkout-email-input"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => onEmailChange?.(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none transition focus:border-red-500"
          />
        </div>
      )}

      {message && (
        <p className="mt-3 text-center text-sm text-red-400">{message}</p>
      )}

      <button
        type="button"
        onClick={onUnlock}
        disabled={busy}
        className="mt-5 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
      >
        {busy ? 'Redirecting to Stripe…' : CHECKOUT_LABEL}
      </button>

      <div className="mt-4 space-y-3">
        <SocialProof />
        <div className="flex justify-center">
          <ShareButton
            variant="promo"
            className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-2.5 text-sm text-gray-300 transition hover:border-red-500 sm:w-auto"
          />
        </div>
        <PaymentBadges />
      </div>
    </div>
  );
}
