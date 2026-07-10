import { EVENT } from '@/lib/event';

export default function FighterHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-600/40 sm:rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(220,38,38,0.25)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(255,255,255,0.06)_0%,_transparent_55%)]" />

      <div className="relative grid min-h-[200px] grid-cols-2 sm:min-h-[280px]">
        <div className="flex flex-col items-center justify-end border-r border-red-600/20 px-3 pb-6 pt-8 text-center sm:px-6 sm:pb-10">
          <div className="mb-3 h-20 w-20 rounded-full border-2 border-white/20 bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-lg shadow-red-900/30 sm:h-28 sm:w-28" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
            {EVENT.fighter1Stats.country}
          </p>
          <p className="mt-1 text-xl font-black text-white sm:text-3xl">{EVENT.fighter1}</p>
          <p className="text-xs text-gray-500 sm:text-sm">{EVENT.fighter1Stats.nickname}</p>
        </div>

        <div className="relative flex flex-col items-center justify-end px-3 pb-6 pt-8 text-center sm:px-6 sm:pb-10">
          <div className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-red-500 bg-black text-sm font-black text-red-500 sm:h-16 sm:w-16 sm:text-lg">
            VS
          </div>
          <div className="mb-3 h-20 w-20 rounded-full border-2 border-red-500/30 bg-gradient-to-b from-red-950 to-zinc-900 shadow-lg shadow-red-900/30 sm:h-28 sm:w-28" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
            {EVENT.fighter2Stats.country}
          </p>
          <p className="mt-1 text-xl font-black text-white sm:text-3xl">{EVENT.fighter2}</p>
          <p className="text-xs text-gray-500 sm:text-sm">{EVENT.fighter2Stats.nickname}</p>
        </div>
      </div>

      <div className="relative border-t border-red-600/20 bg-black/40 px-4 py-3 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400 sm:text-xs">
          {EVENT.number} • {EVENT.tagline}
        </p>
        <p className="mt-1 text-xs text-gray-500">{EVENT.venue}</p>
      </div>
    </div>
  );
}
