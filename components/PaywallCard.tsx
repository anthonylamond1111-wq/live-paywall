import { CHECKOUT_LABEL } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import FreeVsPaid from '@/components/FreeVsPaid';
import PaymentBadges from '@/components/PaymentBadges';
import SocialProof from '@/components/SocialProof';

type PaywallCardProps = {
  email?: string | null;
  message?: string;
  busy: boolean;
  onCheckout: () => void;
};

export default function PaywallCard({ email, message, busy, onCheckout }: PaywallCardProps) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <SocialProof />

      <div className="rounded-2xl border border-red-600/50 bg-zinc-900/90 p-6 text-center shadow-[0_0_60px_rgba(220,38,38,0.08)] sm:rounded-3xl sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 sm:mb-8 sm:h-20 sm:w-20">
          <svg className="h-8 w-8 text-red-400 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-4xl">Unlock the Live Stream</h2>
        <p className="mb-2 text-sm text-gray-400 sm:text-base">
          One-time payment for full access tonight.
        </p>
        <p className="mb-6 text-lg font-semibold text-white sm:mb-8">{EVENT.priceLabel}</p>

        <ul className="mb-6 space-y-2 text-left sm:mb-8">
          {EVENT.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-gray-300">
              <span className="text-red-500">✓</span>
              {perk}
            </li>
          ))}
        </ul>

        {email && (
          <p className="mb-4 text-sm text-gray-500">Signed in as {email}</p>
        )}

        {message && <p className="mb-4 text-sm text-red-400">{message}</p>}

        <button
          type="button"
          onClick={onCheckout}
          disabled={busy}
          className="mb-4 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60 sm:py-8 sm:text-2xl"
        >
          {busy ? 'Redirecting to Stripe…' : CHECKOUT_LABEL}
        </button>

        <PaymentBadges />
        <p className="mt-3 text-xs text-gray-600">Secure checkout • Instant access • Money-back if we fail to deliver</p>
      </div>

      <FreeVsPaid />
    </div>
  );
}
