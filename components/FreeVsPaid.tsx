export default function FreeVsPaid() {
  const rows = [
    { feature: 'Watch time', free: '60 sec preview', paid: 'Full event' },
    { feature: 'Video quality', free: 'Preview only', paid: 'Full HD' },
    { feature: 'Live chat', free: '—', paid: '✓' },
    { feature: 'All devices', free: '—', paid: '✓' },
    { feature: 'Saved access', free: '—', paid: '✓' },
  ];

  return (
    <div className="gold-table overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="gold-table-header grid grid-cols-3 text-center text-xs font-semibold uppercase tracking-wider sm:text-sm">
        <div className="px-3 py-3 text-gray-500" />
        <div className="border-l border-amber-500/20 px-3 py-3 text-gray-400">Free</div>
        <div className="gold-table-paid-col border-l border-amber-400/40 px-3 py-3 text-amber-200">
          Paid
        </div>
      </div>
      {rows.map((row) => (
        <div
          key={row.feature}
          className="gold-table-row grid grid-cols-3 text-center text-sm last:border-0"
        >
          <div className="px-3 py-3 text-left text-gray-400">{row.feature}</div>
          <div className="border-l border-amber-500/15 px-3 py-3 text-gray-500">{row.free}</div>
          <div className="gold-table-paid-col border-l border-amber-400/30 px-3 py-3 font-semibold text-amber-50">
            {row.paid}
          </div>
        </div>
      ))}
    </div>
  );
}
