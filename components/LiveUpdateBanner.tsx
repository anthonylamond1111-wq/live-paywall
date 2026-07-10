import { getLiveUpdateMessage } from '@/lib/event';

export default function LiveUpdateBanner() {
  const message = getLiveUpdateMessage();
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
        Live update
      </p>
      <p className="mt-1 text-sm font-medium text-white">{message}</p>
    </div>
  );
}
