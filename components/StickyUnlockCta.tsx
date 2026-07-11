'use client';

import { useEffect, useState } from 'react';
import { CHECKOUT_LABEL } from '@/lib/constants';
import { LANDING_FUNNEL_WIDTH } from '@/components/LandingFunnel';

type StickyUnlockCtaProps = {
  visible: boolean;
  onUnlock: () => void;
  busy?: boolean;
};

export default function StickyUnlockCta({
  visible,
  onUnlock,
  busy = false,
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-red-600/30 bg-black/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className={`${LANDING_FUNNEL_WIDTH} flex items-center gap-3 px-4 sm:px-0`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Keep watching live</p>
          <p className="truncate text-xs text-gray-500">{CHECKOUT_LABEL}</p>
        </div>
        <button
          type="button"
          onClick={onUnlock}
          disabled={busy}
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] disabled:opacity-60"
        >
          {busy ? '…' : 'Pay & watch'}
        </button>
      </div>
    </div>
  );
}
