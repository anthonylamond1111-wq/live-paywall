'use client';

import { useEffect, useState } from 'react';
import { CHECKOUT_LABEL } from '@/lib/constants';
import { LANDING_FUNNEL_WIDTH } from '@/components/GuestLanding';

type StickyUnlockCtaProps = {
  visible: boolean;
  onUnlock: () => void;
  busy?: boolean;
  hasEmail?: boolean;
};

export default function StickyUnlockCta({
  visible,
  onUnlock,
  busy = false,
  hasEmail = false,
}: StickyUnlockCtaProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShow(true);
      return;
    }

    const onScroll = () => {
      setShow(window.scrollY > 320);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visible]);

  if (!show) return null;

  const handleClick = () => {
    if (!hasEmail) {
      document.getElementById('pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('#pay input[type="email"]');
        input?.focus();
      }, 350);
    }
    onUnlock();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-red-600/30 bg-black/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className={`${LANDING_FUNNEL_WIDTH} flex items-center gap-3 px-4 sm:px-0`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {hasEmail ? 'Keep watching live' : 'Enter email, then pay'}
          </p>
          <p className="truncate text-xs text-gray-500">{CHECKOUT_LABEL}</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="pay-cta-btn shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
        >
          {busy ? '…' : CHECKOUT_LABEL.replace(/^Pay\s+/i, '')}
        </button>
      </div>
    </div>
  );
}
