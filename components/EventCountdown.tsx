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

  return (
    <div className="mb-6 text-center sm:mb-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400 sm:text-xs">
        Stream starts in
      </p>
      <div className="mt-3 flex items-end justify-center gap-3 sm:gap-5">
        {countdown.days > 0 && (
          <>
            <TimeBlock label="Days" value={pad(countdown.days)} />
            <span className="mb-5 text-xl font-light text-red-500/40 sm:text-2xl">:</span>
          </>
        )}
        <TimeBlock label="Hrs" value={pad(countdown.hours)} />
        <span className="mb-5 text-xl font-light text-red-500/40 sm:text-2xl">:</span>
        <TimeBlock label="Min" value={pad(countdown.minutes)} />
        <span className="mb-5 text-xl font-light text-red-500/40 sm:text-2xl">:</span>
        <TimeBlock label="Sec" value={pad(countdown.seconds)} />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {EVENT.streamStartLabel} • {EVENT.fighter1} vs {EVENT.fighter2}
      </p>
      {countdown.totalHours < 48 && (
        <p className="mt-1 text-[11px] text-gray-600">
          About {countdown.totalHours} hour{countdown.totalHours === 1 ? '' : 's'} from now
        </p>
      )}
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[44px] sm:min-w-[52px]">
      <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">{label}</div>
    </div>
  );
}
