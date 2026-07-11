'use client';

import { CHECKOUT_LABEL } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import PaymentBadges from '@/components/PaymentBadges';
import ShareButton from '@/components/ShareButton';
import SocialProof from '@/components/SocialProof';

type PreviewConversionProps = {
  onUnlock: () => void;
  variant?: 'default' | 'expired';
  isLoggedIn?: boolean;
  userEmail?: string | null;
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
  isLoggedIn = false,
  userEmail,
  busy = false,
}: PreviewConversionProps) {
  return (
    <div
      id="pay"
      className="scroll-mt-28 rounded-2xl border border-red-600/40 bg-gradient-to-b from-zinc-900/95 to-black p-5 sm:rounded-3xl sm:p-6"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
          Step 3 · Pay & watch
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
          {variant === 'expired'
            ? 'Unlock the full live stream'
            : 'Ready to watch the full event?'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {isLoggedIn
            ? 'One-time payment for full HD stream and live chat.'
            : 'Create your account above first, then come back here to pay.'}
        </p>
        <p className="mt-3 text-lg font-semibold text-white">{EVENT.priceLabel}</p>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {TRUST_POINTS.map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-green-400">✓</span>
            {point}
          </li>
        ))}
      </ul>

      {isLoggedIn && userEmail && (
        <p className="mt-5 text-center text-sm text-gray-500">Signed in as {userEmail}</p>
      )}

      <button
        type="button"
        onClick={onUnlock}
        disabled={busy}
        className="mt-5 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
      >
        {busy
          ? 'Redirecting to Stripe…'
          : isLoggedIn
            ? CHECKOUT_LABEL
            : 'Create account to pay'}
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
