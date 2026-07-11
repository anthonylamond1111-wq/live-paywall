export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-zinc-800/80 pt-8 pb-6 text-center sm:mt-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        UFC ACCESS
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
        <a href="/support" className="transition hover:text-red-400">
          Support
        </a>
        <a href="/terms" className="transition hover:text-red-400">
          Terms
        </a>
        <a href="/refund" className="transition hover:text-red-400">
          Refund policy
        </a>
      </div>
      <p className="mt-4 text-[10px] text-gray-600">
        © {year} UFC Access. Private live stream access. Not affiliated with UFC.
      </p>
    </footer>
  );
}
