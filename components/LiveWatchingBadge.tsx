'use client';

import { useEffect, useState } from 'react';

type LiveWatchingBadgeProps = {
  visible?: boolean;
};

/** Public live social proof from heartbeat sessions. */
export default function LiveWatchingBadge({ visible = true }: LiveWatchingBadgeProps) {
  const [watching, setWatching] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    let active = true;

    const load = async () => {
      try {
        const res = await fetch('/api/stats', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        const count =
          typeof data.watchingNow === 'number'
            ? data.watchingNow
            : typeof data.activeNow === 'number'
              ? data.activeNow
              : null;
        setWatching(count);
      } catch {
        if (active) setWatching(null);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [visible]);

  if (!visible || watching === null || watching < 1) return null;

  return (
    <div className="live-watching-badge flex items-center justify-center gap-2 text-xs text-gray-300">
      <span className="preview-live-dot h-1.5 w-1.5 rounded-full bg-green-500" />
      <span>
        <span className="font-semibold text-white">{watching}</span> watching now
      </span>
    </div>
  );
}
