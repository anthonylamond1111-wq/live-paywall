'use client';

import { useState } from 'react';
import { SITE_NAME } from '@/lib/brand';
import { formatPreviewDuration } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

type ShareButtonProps = {
  variant?: 'default' | 'promo';
  className?: string;
};

export default function ShareButton({ variant = 'default', className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = EVENT.siteUrl;
    const text =
      variant === 'promo'
        ? `${EVENT.number} — ${EVENT.fighter1} vs ${EVENT.fighter2}. ${formatPreviewDuration(true)} free preview, then £2.50 for full HD + live chat.`
        : `${EVENT.number} — ${EVENT.fighter1} vs ${EVENT.fighter2}. Watch live on ${SITE_NAME}.`;

    trackAnalytics(AnalyticsEvents.SHARE, { variant });

    if (navigator.share) {
      try {
        await navigator.share({ title: SITE_NAME, text, url });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const label =
    variant === 'promo'
      ? copied
        ? 'Link copied!'
        : 'Share free preview with mates'
      : copied
        ? 'Link copied!'
        : 'Share with mates';

  return (
    <button
      type="button"
      onClick={share}
      className={
        className ||
        'rounded-lg border border-zinc-700 px-4 py-2 text-sm text-gray-300 transition hover:border-red-500'
      }
    >
      {label}
    </button>
  );
}
