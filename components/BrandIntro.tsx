'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import {
  playBrandIntroSound,
  preloadIntroSound,
  waitForIntroSoundEnd,
} from '@/lib/intro-sound';

const INTRO_KEY = 'ufc_access_intro_seen_v3';

export default function BrandIntro() {
  const [visible, setVisible] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const runningRef = useRef(false);

  const finishIntro = useCallback(() => {
    sessionStorage.setItem(INTRO_KEY, '1');
    setVisible(false);
    setNeedsTap(false);
  }, []);

  const runIntro = useCallback(
    async (fromUserGesture: boolean) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setNeedsTap(false);

      const started = await playBrandIntroSound(fromUserGesture);
      if (!started) {
        runningRef.current = false;
        setNeedsTap(true);
        return;
      }

      await waitForIntroSoundEnd();
      finishIntro();
      runningRef.current = false;
    },
    [finishIntro]
  );

  useEffect(() => {
    if (sessionStorage.getItem(INTRO_KEY) === '1') return;

    setVisible(true);
    preloadIntroSound();
    void runIntro(false);
  }, [runIntro]);

  const handleEnter = () => {
    void runIntro(true);
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Enter UFC Access"
      onClick={handleEnter}
      className="brand-intro fixed inset-0 z-[200] flex cursor-pointer items-center justify-center border-0 bg-black p-0 text-left"
    >
      <div className="pointer-events-none text-center">
        <BrandLogo size="intro" className="brand-intro-logo" />
        <div className="brand-intro-line mx-auto mt-4 h-0.5 w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        <p className="brand-intro-tag mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">
          Live stream
        </p>
        {needsTap && (
          <p className="intro-tap-hint mt-8 text-[11px] font-semibold uppercase tracking-[0.35em] text-red-400/90">
            Tap to enter
          </p>
        )}
      </div>
    </button>
  );
}
