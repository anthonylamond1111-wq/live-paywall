'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { MuxPlayerRefAttributes } from '@mux/mux-player-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

type StreamPlayerProps = {
  src: string;
};

function isMobileDevice() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function isLandscape() {
  return window.matchMedia('(orientation: landscape)').matches;
}

async function enterFullscreen(el: HTMLElement) {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    requestFullscreen?: () => Promise<void>;
  };

  try {
    if (anyEl.requestFullscreen) {
      await anyEl.requestFullscreen();
    } else if (anyEl.webkitRequestFullscreen) {
      await anyEl.webkitRequestFullscreen();
    }
  } catch {
    // User gesture or browser policy may block fullscreen
  }
}

export default function StreamPlayer({ src }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);

  useEffect(() => {
    const syncFullscreen = () => {
      if (!isMobileDevice() || !isLandscape()) return;

      const playerEl =
        (containerRef.current?.querySelector('mux-player') as HTMLElement | null) ??
        (playerRef.current as unknown as HTMLElement | null);

      if (playerEl) {
        void enterFullscreen(playerEl);
      }
    };

    const timer = window.setTimeout(syncFullscreen, 300);
    window.addEventListener('orientationchange', syncFullscreen);
    screen.orientation?.addEventListener('change', syncFullscreen);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('orientationchange', syncFullscreen);
      screen.orientation?.removeEventListener('change', syncFullscreen);
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border-2 border-red-600 bg-black shadow-2xl sm:rounded-3xl sm:border-4 landscape:fixed landscape:inset-0 landscape:z-[100] landscape:rounded-none landscape:border-0"
    >
      <MuxPlayer
        ref={playerRef}
        src={src}
        streamType="live"
        autoPlay
        muted
        playsInline
        className="h-full w-full aspect-video landscape:aspect-auto landscape:min-h-[100dvh]"
      />
    </div>
  );
}
