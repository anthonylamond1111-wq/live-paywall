import { EVENT } from '@/lib/event';

type EventBannerProps = {
  compact?: boolean;
  showLive?: boolean;
};

export default function EventBanner({ compact = false, showLive = false }: EventBannerProps) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-red-600/40 bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-900/90 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-500 sm:text-xs">
              {EVENT.number} • Live Event
            </p>
            <p className="mt-1 text-lg font-black tracking-tight sm:text-2xl">
              {EVENT.fighter1}{' '}
              <span className="text-sm font-normal text-gray-500 sm:text-base">vs</span>{' '}
              {EVENT.fighter2}
            </p>
          </div>
          {showLive && (
            <div className="live-badge flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1.5">
              <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 sm:text-xs">
                Live
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 text-center sm:mb-16">
      <div className="mb-3 text-[10px] tracking-[3px] text-red-500 sm:mb-6 sm:text-sm sm:tracking-[4px]">
        {EVENT.number} • LIVE EVENT
      </div>
      <h1 className="mb-4 text-4xl font-black leading-none tracking-tight sm:mb-6 sm:text-7xl md:text-8xl md:tracking-[-3px]">
        {EVENT.fighter1}
        <br />
        <span className="text-2xl font-normal text-gray-600 sm:text-4xl">VS</span>
        <br />
        {EVENT.fighter2}
      </h1>
      <p className="text-base text-gray-400 sm:text-2xl">{EVENT.tagline}</p>
      <p className="mt-2 text-xs text-gray-600 sm:text-sm">{EVENT.venue}</p>
    </div>
  );
}
