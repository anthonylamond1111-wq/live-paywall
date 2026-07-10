import { EVENT } from '@/lib/event';

function FighterColumn({ stats, align }: { stats: typeof EVENT.fighter1Stats; align: 'left' | 'right' }) {
  const rows = [
    ['Record', stats.record],
    ['Height', stats.height],
    ['Reach', stats.reach],
    ['Stance', stats.stance],
    ['Country', stats.country],
  ];

  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">{stats.nickname}</p>
      <p className="mt-1 text-lg font-bold text-white">{stats.name}</p>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function TaleOfTheTape() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
        Tale of the tape
      </p>
      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        <FighterColumn stats={EVENT.fighter1Stats} align="left" />
        <FighterColumn stats={EVENT.fighter2Stats} align="right" />
      </div>
    </div>
  );
}
