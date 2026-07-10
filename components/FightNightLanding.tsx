'use client';

import { useEffect, useState } from 'react';
import { EVENT, getEventCountdown } from '@/lib/event';
import JourneyProgress from '@/components/JourneyProgress';

type FightNightLandingProps = {
  journeyStep: 'preview' | 'account' | 'pay' | 'watch';
  hideSignupCta?: boolean;
  /** Extra height (px) so poster reaches the Access confirmed badge on success */
  extendForSuccess?: boolean;
};

const HERO_MOBILE =
  process.env.NEXT_PUBLIC_HERO_IMAGE_MOBILE ??
  process.env.NEXT_PUBLIC_HERO_IMAGE ??
  '/fighters/hero-mobile.png';

const HERO_DESKTOP =
  process.env.NEXT_PUBLIC_HERO_IMAGE_DESKTOP ??
  process.env.NEXT_PUBLIC_HERO_IMAGE ??
  '/fighters/hero-desktop.png';

const heroImgClass =
  'hero-octagon-image absolute inset-0 h-full w-full object-cover';

function HeroBackground() {
  return (
    <>
      <img
        src={HERO_MOBILE}
        alt=""
        fetchPriority="high"
        decoding="async"
        className={`${heroImgClass} object-[center_20%] md:hidden`}
      />
      <img
        src={HERO_DESKTOP}
        alt=""
        fetchPriority="high"
        decoding="async"
        className={`${heroImgClass} hidden object-center md:block`}
      />
    </>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function HeroCountdown() {
  const [countdown, setCountdown] = useState(getEventCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getEventCountdown());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!countdown.isBeforeEvent) {
    return (
      <p className="mt-6 text-sm font-medium text-white">Stream is live or starting soon</p>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-400 sm:text-xs">
        Stream starts in
      </p>
      <div className="mt-3 flex items-end justify-center gap-1.5 sm:mt-4 sm:gap-2">
        {countdown.days > 0 && (
          <>
            <CountdownUnit label="Days" value={pad(countdown.days)} />
            <span className="mb-5 text-xl font-light text-red-500/50 sm:mb-6 sm:text-2xl">:</span>
          </>
        )}
        <CountdownUnit label="Hours" value={pad(countdown.hours)} />
        <span className="mb-5 text-xl font-light text-red-500/50 sm:mb-6 sm:text-2xl">:</span>
        <CountdownUnit label="Mins" value={pad(countdown.minutes)} />
        <span className="mb-5 text-xl font-light text-red-500/50 sm:mb-6 sm:text-2xl">:</span>
        <CountdownUnit label="Secs" value={pad(countdown.seconds)} />
      </div>
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[40px] sm:min-w-[52px]">
      <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</div>
    </div>
  );
}

export default function FightNightLanding({
  journeyStep,
  hideSignupCta = false,
  extendForSuccess = false,
}: FightNightLandingProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${
        extendForSuccess
          ? 'h-[calc(50dvh+9.5rem)] min-h-[420px]'
          : 'h-[50dvh] min-h-[300px]'
      }`}
    >
      <HeroBackground />

      <div className="hero-octagon-vignette absolute inset-0" aria-hidden />

      <div className="relative z-10 flex h-full flex-col pt-[4.25rem] sm:pt-[5.25rem]">
        <div className="hero-journey-bar px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto max-w-6xl">
            <JourneyProgress current={journeyStep} onDark />
          </div>
        </div>

        <div
          className={
            hideSignupCta
              ? 'flex-1'
              : 'flex flex-1 items-center justify-center px-4 pb-4 sm:px-8 sm:pb-6'
          }
        >
          {!hideSignupCta && (
          <div className="w-full max-w-sm rounded-xl border border-red-600/40 bg-black/70 px-5 py-5 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:max-w-md sm:rounded-2xl sm:px-7 sm:py-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
              {EVENT.number} • {EVENT.tagline}
            </p>

            <HeroCountdown />

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-300 sm:text-[11px]">
              Available exclusively on UFC Access
            </p>
            <a
              href="#signup"
              className="mt-2 inline-block text-sm font-medium text-red-400 underline underline-offset-4 transition hover:text-red-300"
            >
              Sign up to watch live
            </a>
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
