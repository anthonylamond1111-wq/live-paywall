'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import type { MuxPlayerRefAttributes } from '@mux/mux-player-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

type StreamPlayerProps = {
  src: string;
  fill?: boolean;
};

export default function StreamPlayer({ src, fill = false }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden bg-black ${
        fill
          ? 'h-full min-h-0 rounded-none border-0'
          : 'rounded-2xl border-2 border-red-600 shadow-2xl sm:rounded-3xl sm:border-4'
      }`}
    >
      <MuxPlayer
        ref={playerRef}
        src={src}
        streamType="live"
        autoPlay
        muted
        playsInline
        className={`h-full w-full ${fill ? 'min-h-0' : 'aspect-video'}`}
      />
    </div>
  );
}

export function useStreamFullscreen(containerRef: React.RefObject<HTMLElement | null>) {
  const enter = async () => {
    const el = containerRef.current;
    if (!el) return false;

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return true;
      }
      const webkitEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (webkitEl.webkitRequestFullscreen) {
        await webkitEl.webkitRequestFullscreen();
        return true;
      }
    } catch {
      // Fall back to CSS overlay mode in parent
    }
    return false;
  };

  const exit = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Parent handles CSS overlay exit
    }
  };

  return { enter, exit };
}
