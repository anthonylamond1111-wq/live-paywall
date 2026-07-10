import { EVENT } from '@/lib/event';

type FighterHeroProps = {
  compact?: boolean;
};

function FighterSilhouette({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right' ? 'scaleX(-1)' : undefined;

  return (
    <svg
      viewBox="0 0 120 200"
      className="h-full w-full opacity-90"
      style={{ transform: flip }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`fighter-grad-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="28" rx="18" ry="20" fill={`url(#fighter-grad-${side})`} />
      <path
        d="M42 48 C30 70 25 100 28 130 L35 195 L50 195 L52 140 L58 195 L72 195 L75 130 C78 100 73 70 62 48 Z"
        fill={`url(#fighter-grad-${side})`}
      />
      <path
        d="M28 55 L10 85 L18 92 L32 68 M92 55 L110 85 L102 92 L88 68"
        fill={`url(#fighter-grad-${side})`}
      />
      <path
        d="M35 75 L20 110 L28 115 L40 85 M85 75 L100 110 L92 115 L80 85"
        fill={`url(#fighter-grad-${side})`}
      />
      <path d="M48 195 L40 200 L68 200 L62 195" fill="#18181b" />
    </svg>
  );
}

export default function FighterHero({ compact = false }: FighterHeroProps) {
  return (
    <div
      className={`fight-hero relative overflow-hidden rounded-2xl border border-red-600/50 shadow-[0_0_80px_rgba(220,38,38,0.15)] sm:rounded-3xl ${
        compact ? 'mb-4' : 'mb-6 sm:mb-8'
      }`}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(127,29,29,0.45)_0%,transparent_45%,transparent_55%,rgba(24,24,27,0.8)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.12)_0%,transparent_65%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.4) 40px, rgba(255,255,255,0.4) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.4) 40px, rgba(255,255,255,0.4) 41px)',
        }}
      />

      {/* Giant background names */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="flex w-full max-w-5xl items-center justify-between px-2 opacity-[0.07] sm:px-6">
          <span className="fight-hero-bg-name text-left">{EVENT.fighter1}</span>
          <span className="fight-hero-bg-name text-right">{EVENT.fighter2}</span>
        </div>
      </div>

      {/* Top badge */}
      <div className="relative z-10 px-4 pt-4 text-center sm:pt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-500 sm:text-xs">
          {EVENT.number}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
          {EVENT.venue}
        </p>
      </div>

      {/* Main fight graphic */}
      <div
        className={`relative z-10 grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-3 sm:gap-4 sm:px-8 ${
          compact ? 'min-h-[220px] pb-4 pt-2 sm:min-h-[260px]' : 'min-h-[300px] pb-6 pt-4 sm:min-h-[440px] sm:pb-10'
        }`}
      >
        {/* McGregor side */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`relative w-full max-w-[140px] sm:max-w-[200px] ${
              compact ? 'h-[120px] sm:h-[150px]' : 'h-[160px] sm:h-[240px]'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(220,38,38,0.35)_0%,transparent_70%)]" />
            <FighterSilhouette side="left" />
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
            {EVENT.fighter1Stats.country} • {EVENT.fighter1Stats.record}
          </p>
          <h2
            className={`fight-hero-name mt-1 leading-none text-white ${
              compact ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-6xl md:text-7xl'
            }`}
          >
            {EVENT.fighter1}
          </h2>
          <p className="mt-1 text-xs font-medium text-red-400 sm:text-sm">
            &ldquo;{EVENT.fighter1Stats.nickname}&rdquo;
          </p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center justify-center self-center pb-8 sm:pb-16">
          <div className="fight-hero-vs flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-black/80 text-lg font-black text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] sm:h-20 sm:w-20 sm:text-2xl">
            VS
          </div>
          <p className="mt-3 hidden text-[10px] font-semibold uppercase tracking-widest text-gray-500 sm:block">
            Lightweight
          </p>
        </div>

        {/* Holloway side */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`relative w-full max-w-[140px] sm:max-w-[200px] ${
              compact ? 'h-[120px] sm:h-[150px]' : 'h-[160px] sm:h-[240px]'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(161,161,170,0.2)_0%,transparent_70%)]" />
            <FighterSilhouette side="right" />
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 sm:text-xs">
            {EVENT.fighter2Stats.country} • {EVENT.fighter2Stats.record}
          </p>
          <h2
            className={`fight-hero-name mt-1 leading-none text-white ${
              compact ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-6xl md:text-7xl'
            }`}
          >
            {EVENT.fighter2}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400 sm:text-sm">
            &ldquo;{EVENT.fighter2Stats.nickname}&rdquo;
          </p>
        </div>
      </div>

      {/* Footer tagline */}
      <div className="relative z-10 border-t border-red-600/30 bg-gradient-to-r from-red-950/40 via-black/60 to-red-950/40 px-4 py-3 text-center backdrop-blur-sm sm:py-4">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400 sm:text-sm">
          {EVENT.tagline}
        </p>
        <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">{EVENT.streamStartLabel}</p>
      </div>
    </div>
  );
}
