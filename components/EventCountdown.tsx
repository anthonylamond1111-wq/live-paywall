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
    <div className="mb-6 rounded-2xl border border-red-600/30 bg-zinc-900/80 px-4 py-4 text-center sm:mb-8 sm:px-6 sm:py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400 sm:text-xs">
        Main card starts in
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 sm:gap-4">
        {countdown.days > 0 && (
          <TimeBlock label="Days" value={pad(countdown.days)} />
        )}
        <TimeBlock label="Hrs" value={pad(countdown.hours)} />
        <span className="text-xl text-red-500/60">:</span>
        <TimeBlock label="Min" value={pad(countdown.minutes)} />
        <span className="text-xl text-red-500/60">:</span>
        <TimeBlock label="Sec" value={pad(countdown.seconds)} />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {EVENT.fighter1} vs {EVENT.fighter2} • {EVENT.venue}
      </p>
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[52px] rounded-xl border border-zinc-800 bg-black/50 px-2 py-2 sm:min-w-[64px] sm:px-3 sm:py-3">
      <div className="font-mono text-2xl font-bold text-white sm:text-3xl">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}
