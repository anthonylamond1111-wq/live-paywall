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

  const parts: { value: string; key: string }[] = [];
  if (countdown.days > 0) parts.push({ value: pad(countdown.days), key: 'd' });
  parts.push(
    { value: pad(countdown.hours), key: 'h' },
    { value: pad(countdown.minutes), key: 'm' },
    { value: pad(countdown.seconds), key: 's' }
  );

  return (
    <div className="py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-400 sm:text-xs">
        Stream starts in
      </p>
      <p className="countdown-tick mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-white sm:mt-3 sm:text-5xl">
        {parts.map((part, i) => (
          <span key={part.key}>
            {i > 0 && <span className="mx-1 text-red-500/60 sm:mx-1.5">:</span>}
            <span className={part.key === 's' ? 'countdown-seconds' : undefined}>{part.value}</span>
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-gray-500">{EVENT.streamStartLabel}</p>
    </div>
  );
}
