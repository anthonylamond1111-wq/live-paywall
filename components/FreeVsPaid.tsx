export default function FreeVsPaid() {
  const rows = [
    { feature: 'Watch time', free: '60 sec preview', paid: 'Full event' },
    { feature: 'Video quality', free: 'Preview only', paid: 'Full HD' },
    { feature: 'Live chat', free: '—', paid: '✓' },
    { feature: 'All devices', free: '—', paid: '✓' },
    { feature: 'Saved access', free: '—', paid: '✓' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-900/60 text-center text-xs font-semibold uppercase tracking-wider sm:text-sm">
        <div className="px-3 py-3 text-gray-500" />
        <div className="border-l border-zinc-800 px-3 py-3 text-gray-400">Free</div>
        <div className="border-l border-red-600/30 bg-red-500/5 px-3 py-3 text-red-400">Paid</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.feature}
          className="grid grid-cols-3 border-b border-zinc-800/80 text-center text-sm last:border-0"
        >
          <div className="px-3 py-3 text-left text-gray-400">{row.feature}</div>
          <div className="border-l border-zinc-800/80 px-3 py-3 text-gray-500">{row.free}</div>
          <div className="border-l border-red-600/20 bg-red-500/5 px-3 py-3 font-medium text-white">
            {row.paid}
          </div>
        </div>
      ))}
    </div>
  );
}
