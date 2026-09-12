type StreamConnectingProps = {
  fill?: boolean;
  message?: string;
};

export default function StreamConnecting({
  fill = false,
  message = 'Connecting to live stream…',
}: StreamConnectingProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center bg-black px-6 text-center ${
        fill ? 'h-full min-h-0' : 'aspect-video rounded-2xl border-2 border-red-600/40 sm:rounded-3xl'
      }`}
    >
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" />
        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border border-red-500/20" />
      </div>
      <p className="mt-4 text-sm text-gray-400">{message}</p>
    </div>
  );
}
