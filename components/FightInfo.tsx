'use client';

import { useState } from 'react';
import { EVENT } from '@/lib/event';

export default function FightInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5 sm:py-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Fight card
          </p>
          <p className="text-sm text-gray-400">{EVENT.number} • {EVENT.venue}</p>
        </div>
        <span className="text-lg text-gray-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-3 sm:px-5 sm:py-4">
          <ul className="space-y-3">
            {EVENT.fightCard.map((bout) => (
              <li
                key={bout.fighters}
                className={`rounded-xl px-3 py-2.5 sm:px-4 ${
                  bout.main ? 'border border-red-600/30 bg-red-500/5' : 'bg-zinc-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm font-medium ${bout.main ? 'text-white' : 'text-gray-200'}`}>
                    {bout.fighters}
                    {bout.main && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        Main event
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 text-xs text-gray-500">{bout.weight}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
