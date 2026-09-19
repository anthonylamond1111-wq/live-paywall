'use client';

import PaymentBadges from '@/components/PaymentBadges';
import ShareButton from '@/components/ShareButton';
import SocialProof from '@/components/SocialProof';
import { CHECKOUT_LABEL } from '@/lib/constants';
import { EVENT } from '@/lib/event';

type PreviewConversionProps = {
  onUnlock: () => void;
  variant?: 'default' | 'expired';
  busy?: boolean;
  message?: string;
  email: string;
  onEmailChange: (value: string) => void;
};

const TRUST_POINTS = [
  'Real live HD stream',
  'No account needed',
  'Saved on this device',
  'One device at a time',
];

export default function PreviewConversion({
  onUnlock,
  variant = 'default',
  busy = false,
  message,
  email,
  onEmailChange,
}: PreviewConversionProps) {
  return (
    <div
      id="pay"
      className="scroll-mt-28 rounded-2xl border border-red-600/40 bg-gradient-to-b from-zinc-900/95 to-black p-5 sm:rounded-3xl sm:p-6"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
          Pay once · Watch on this device
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
          {variant === 'expired'
            ? 'Unlock clear video + audio'
            : 'Ready to watch the full event?'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {variant === 'expired'
            ? 'Preview is locked. Pay once for sharp HD and full sound on this device — no account needed.'
            : 'No signup. Pay once and this device keeps access. Restore on a new device with your receipt email — that kicks the old device.'}
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

      <p className="mt-5 rounded-xl border border-zinc-700/80 bg-black/50 px-4 py-3 text-center text-sm text-gray-300">
        Enter your email first, then click <span className="font-semibold text-white">{CHECKOUT_LABEL}</span>
      </p>

      {message && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {message}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <input
          type="email"
          required
          placeholder="Email for your ticket / receipt"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-base text-white outline-none transition focus:border-red-500"
        />
        <button
          type="button"
          onClick={onUnlock}
          disabled={busy}
          className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
        >
          {busy ? 'Redirecting to Stripe…' : CHECKOUT_LABEL}
        </button>
      </div>

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
