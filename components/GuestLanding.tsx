'use client';

import EventCountdown from '@/components/EventCountdown';
import FaceOff from '@/components/FaceOff';
import FAQ from '@/components/FAQ';
import FreeVsPaid from '@/components/FreeVsPaid';
import JourneyProgress from '@/components/JourneyProgress';
import LiveUpdateBanner from '@/components/LiveUpdateBanner';
import LiveWatchingBadge from '@/components/LiveWatchingBadge';
import NotifyWhenLive from '@/components/NotifyWhenLive';
import PreviewConversion from '@/components/PreviewConversion';
import PreviewStream from '@/components/PreviewStream';
import RestoreAccessForm from '@/components/RestoreAccessForm';
import ShareButton from '@/components/ShareButton';
import StickyUnlockCta from '@/components/StickyUnlockCta';
import { formatPreviewDuration } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import { AnalyticsEvents, trackAnalytics } from '@/lib/analytics';

export const LANDING_FUNNEL_WIDTH =
  'mx-auto w-full max-w-2xl xl:max-w-3xl';

type GuestLandingProps = {
  email: string;
  message: string;
  busy: boolean;
  previewExpired: boolean;
  previewLive: boolean;
  onEmailChange: (value: string) => void;
  onUnlock: () => void;
  onPreviewExpired: () => void;
  onPreviewLiveChange: (live: boolean) => void;
  onRestored: () => void;
};

export default function GuestLanding({
  email,
  message,
  busy,
  previewExpired,
  previewLive,
  onEmailChange,
  onUnlock,
  onPreviewExpired,
  onPreviewLiveChange,
  onRestored,
}: GuestLandingProps) {
  const handleUnlock = () => {
    trackAnalytics(AnalyticsEvents.UNLOCK_CLICK, {
      source: previewExpired ? 'expired' : previewLive ? 'live' : 'funnel',
    });
    onUnlock();
  };

  const journeyCurrent = previewExpired ? 'pay' : 'preview';

  return (
    <>
      <div className={`${LANDING_FUNNEL_WIDTH} space-y-4 pb-24 sm:space-y-5`}>
        {/* First viewport: brand signal via fighters + countdown + player */}
        <header className="border-b border-red-600/20 pb-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
            {EVENT.number} • {EVENT.tagline}
          </p>
          <h1 className="fight-hero-name mt-2 text-3xl text-white sm:text-4xl">
            {EVENT.fighter1}
            <span className="mx-2 text-lg font-bold text-red-500 sm:text-xl">VS</span>
            {EVENT.fighter2}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">{EVENT.venue}</p>
        </header>

        <FaceOff />
        <EventCountdown />
        <LiveWatchingBadge visible={previewLive || previewExpired} />

        <p className="text-center text-sm text-gray-400">
          Free {formatPreviewDuration()} preview — then pay once. No account needed.
        </p>

        <JourneyProgress current={journeyCurrent} onDark />
        <LiveUpdateBanner />

        <PreviewStream
          onPreviewExpired={onPreviewExpired}
          onPreviewLiveChange={onPreviewLiveChange}
          onUnlock={handleUnlock}
        />

        <PreviewConversion
          variant={previewExpired ? 'expired' : 'default'}
          email={email}
          onEmailChange={onEmailChange}
          busy={busy}
          message={message}
          onUnlock={handleUnlock}
        />

        <RestoreAccessForm busy={busy} onRestored={onRestored} />

        {/* Secondary: share, notify, compare, FAQ */}
        <div className="flex justify-center pt-2">
          <ShareButton
            variant="promo"
            className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 hover:text-white sm:text-sm"
          />
        </div>
        <NotifyWhenLive />
        <FreeVsPaid />
        <FAQ />
      </div>

      <StickyUnlockCta
        visible={previewExpired || previewLive}
        onUnlock={handleUnlock}
        busy={busy}
        hasEmail={Boolean(email.trim())}
      />
    </>
  );
}
