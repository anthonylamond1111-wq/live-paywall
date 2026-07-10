'use client';

import { EVENT } from '@/lib/event';
import JourneyProgress from '@/components/JourneyProgress';

type FightNightLandingProps = {
  journeyStep: 'preview' | 'account' | 'pay' | 'watch';
  hideSignupCta?: boolean;
  extendForSuccess?: boolean;
  onCreateAccount?: () => void;
  onSignIn?: () => void;
};

export default function FightNightLanding({
  journeyStep,
  hideSignupCta = false,
  onCreateAccount,
  onSignIn,
}: FightNightLandingProps) {
  return (
    <section className="relative w-full overflow-hidden border-b border-red-600/30 bg-gradient-to-b from-zinc-950 via-black to-black">
      <div className="relative z-10 flex flex-col pt-[4.25rem] sm:pt-[5.25rem]">
        <div className="hero-journey-bar px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto max-w-6xl">
            <JourneyProgress current={journeyStep} onDark />
          </div>
        </div>

        {!hideSignupCta && (
          <div className="flex items-center justify-center px-4 pb-8 pt-2 sm:px-8 sm:pb-10">
            <div className="w-full max-w-sm text-center sm:max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
                {EVENT.number} • {EVENT.tagline}
              </p>

              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 sm:text-[11px]">
                Available exclusively on UFC Access
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6">
                <button
                  type="button"
                  onClick={onCreateAccount}
                  className="w-full rounded-2xl bg-white py-3.5 text-base font-semibold text-black transition hover:bg-gray-100 active:scale-[0.985] sm:py-4 sm:text-lg"
                >
                  Create your account
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full rounded-2xl border border-zinc-700 bg-transparent py-3.5 text-base font-medium text-white transition hover:border-zinc-500 hover:bg-white/5 active:scale-[0.985] sm:py-4 sm:text-lg"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}

        {hideSignupCta && (
          <div className="px-4 pb-6 text-center sm:px-8 sm:pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-xs">
              {EVENT.number} • {EVENT.tagline}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
