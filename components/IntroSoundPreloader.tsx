'use client';

import { useEffect } from 'react';
import { warmIntroSound } from '@/lib/intro-sound';

export default function IntroSoundPreloader() {
  useEffect(() => {
    void warmIntroSound();
  }, []);

  return null;
}
