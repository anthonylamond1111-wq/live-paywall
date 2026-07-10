export type StreamHealthStatus = 'good' | 'buffering' | 'offline';

type StreamHealthProps = {
  status: StreamHealthStatus;
};

const LABELS: Record<StreamHealthStatus, { text: string; color: string }> = {
  good: { text: 'Stream quality: Good', color: 'bg-green-500' },
  buffering: { text: 'Stream quality: Buffering…', color: 'bg-amber-500' },
  offline: { text: 'Stream quality: Connecting…', color: 'bg-zinc-500' },
};

export default function StreamHealth({ status }: StreamHealthProps) {
  const { text, color } = LABELS[status];

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${status === 'buffering' ? 'animate-pulse' : ''}`} />
      {text}
    </div>
  );
}
