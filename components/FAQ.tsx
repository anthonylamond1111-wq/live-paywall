'use client';

import { useState } from 'react';
import { EVENT } from '@/lib/event';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-4 text-center text-lg font-bold sm:text-xl">Frequently asked questions</h3>
      <div className="space-y-2">
        {EVENT.faq.map((item, index) => {
          const open = openIndex === index;
          return (
            <div key={item.q} className="overflow-hidden rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-zinc-800/50 sm:text-base"
              >
                {item.q}
                <span className="ml-3 shrink-0 text-gray-500">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="border-t border-zinc-800/80 px-4 py-3 text-sm leading-relaxed text-gray-400">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
