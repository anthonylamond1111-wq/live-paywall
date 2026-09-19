import { EVENT } from '@/lib/event';

function FighterSide({
  name,
  nickname,
  record,
  country,
  side,
}: {
  name: string;
  nickname: string;
  record: string;
  country: string;
  side: 'left' | 'right';
}) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`flex flex-1 flex-col items-center ${
        side === 'left' ? 'sm:items-start sm:text-left' : 'sm:items-end sm:text-right'
      }`}
    >
      <div
        className={`fighter-face flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500/50 bg-gradient-to-b from-zinc-800 to-zinc-950 text-3xl font-black text-white shadow-[0_0_40px_rgba(220,38,38,0.25)] sm:h-24 sm:w-24 sm:text-4xl ${
          side === 'left' ? 'fighter-face-left' : 'fighter-face-right'
        }`}
        aria-hidden
      >
        {initial}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
        {nickname}
      </p>
      <p className="mt-1 text-sm font-bold text-white sm:text-base">{name}</p>
      <p className="mt-1 text-xs text-gray-500">
        {record} · {country}
      </p>
    </div>
  );
}

/** Compact face-off under the VS headline — monograms + records. */
export default function FaceOff() {
  return (
    <div className="relative mx-auto flex max-w-lg items-end justify-between gap-3 px-1 sm:gap-6">
      <FighterSide
        name={EVENT.fighter1Stats.name}
        nickname={EVENT.fighter1Stats.nickname}
        record={EVENT.fighter1Stats.record}
        country={EVENT.fighter1Stats.country}
        side="left"
      />
      <div className="fight-hero-vs absolute left-1/2 top-8 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-red-500/60 bg-black text-xs font-black text-red-400 sm:top-10 sm:h-12 sm:w-12 sm:text-sm">
        VS
      </div>
      <FighterSide
        name={EVENT.fighter2Stats.name}
        nickname={EVENT.fighter2Stats.nickname}
        record={EVENT.fighter2Stats.record}
        country={EVENT.fighter2Stats.country}
        side="right"
      />
    </div>
  );
}
