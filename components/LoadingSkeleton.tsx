export default function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-zinc-800" />
      <div className="mx-auto h-4 w-48 animate-pulse rounded bg-zinc-800" />
      <div className="h-32 animate-pulse rounded-2xl bg-zinc-900" />
      <div className="h-12 animate-pulse rounded-xl bg-zinc-800" />
    </div>
  );
}
