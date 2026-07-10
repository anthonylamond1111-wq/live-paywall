'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { EVENT, getEventCountdown } from '@/lib/event';
import JourneyProgress from '@/components/JourneyProgress';

type FightNightLandingProps = {
  journeyStep: 'preview' | 'account' | 'pay' | 'watch';
  hideSignupCta?: boolean;
};

const HERO_IMAGE =
  process.env.NEXT_PUBLIC_HERO_IMAGE ?? '/fighters/hero-octagon.png';

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
      <div className="mt-4 flex items-end justify-center gap-2 sm:gap-4">
        {countdown.days > 0 && (
          <>
            <CountdownUnit label="Days" value={pad(countdown.days)} />
            <span className="mb-6 text-2xl font-light text-red-500/50">:</span>
          </>
        )}
        <CountdownUnit label="Hours" value={pad(countdown.hours)} />
        <span className="mb-6 text-2xl font-light text-red-500/50">:</span>
        <CountdownUnit label="Mins" value={pad(countdown.minutes)} />
        <span className="mb-6 text-2xl font-light text-red-500/50">:</span>
        <CountdownUnit label="Secs" value={pad(countdown.seconds)} />
      </div>
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[48px] sm:min-w-[64px]">
      <div className="font-mono text-4xl font-bold tabular-nums text-white sm:text-5xl">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</div>
    </div>
  );
}

export default function FightNightLanding({
  journeyStep,
  hideSignupCta = false,
}: FightNightLandingProps) {
  return (
    <section className="relative -mx-4 mb-8 min-h-[min(92vh,900px)] overflow-hidden rounded-2xl border border-red-600/40 sm:-mx-6 sm:mb-10 sm:rounded-3xl">
      <div className="absolute inset-0 bg-black">
        <Image
          src={HERO_IMAGE}
          alt="UFC Access Night — McGregor vs Holloway"
          fill
          priority
          className="hero-octagon-image object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div className="hero-octagon-vignette absolute inset-0" aria-hidden />

      <div className="relative z-10 flex min-h-[min(92vh,900px)] flex-col">
        <div className="hero-journey-bar mx-4 mt-4 rounded-xl px-3 py-3 sm:mx-8 sm:mt-6 sm:px-5 sm:py-4">
          <JourneyProgress current={journeyStep} onDark />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-md rounded-2xl border border-red-600/50 bg-black/75 px-6 py-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-md sm:px-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-500 sm:text-sm">
              {EVENT.number} • {EVENT.tagline}
            </p>

            <HeroCountdown />

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300 sm:text-xs">
              Available exclusively on UFC Access
            </p>
            {!hideSignupCta && (
              <a
                href="#signup"
                className="mt-3 inline-block text-sm font-medium text-red-400 underline underline-offset-4 transition hover:text-red-300"
              >
                Sign up to watch live
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
