'use client';

import { useState } from 'react';
import { EVENT } from '@/lib/event';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = EVENT.siteUrl;
    const text = `${EVENT.number} — ${EVENT.fighter1} vs ${EVENT.fighter2}. Watch live on UFC Access.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'UFC Access', text, url });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-gray-300 transition hover:border-red-500"
    >
      {copied ? 'Link copied!' : 'Share with mates'}
    </button>
  );
}
