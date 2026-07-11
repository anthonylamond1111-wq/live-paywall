'use client';

import { useEffect, useState } from 'react';
import { EVENT, getEventCountdown } from '@/lib/event';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function EventCountdown() {
  const [countdown, setCountdown] = useState(getEventCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getEventCountdown());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!countdown.isBeforeEvent) return null;

  const parts: string[] = [];
  if (countdown.days > 0) parts.push(pad(countdown.days));
  parts.push(pad(countdown.hours), pad(countdown.minutes), pad(countdown.seconds));

  return (
    <div className="py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-400 sm:text-xs">
        Stream starts in
      </p>
      <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-white sm:mt-3 sm:text-5xl">
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1 text-red-500/60 sm:mx-1.5">:</span>}
            {part}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-gray-600">{EVENT.streamStartLabel}</p>
    </div>
  );
}
