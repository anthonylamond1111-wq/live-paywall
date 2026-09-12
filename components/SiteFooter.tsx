import DiscordHelpLink from '@/components/DiscordHelpLink';
import { SITE_NAME, SITE_NAME_DISPLAY } from '@/lib/brand';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-zinc-800/80 pt-8 pb-6 text-center sm:mt-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {SITE_NAME_DISPLAY}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-500">
        <DiscordHelpLink />
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
        © {year} {SITE_NAME}. Private live stream access. Not affiliated with UFC, Zuffa Boxing, or any official broadcast partner.
      </p>
    </footer>
  );
}
