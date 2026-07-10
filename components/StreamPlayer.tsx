'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

type StreamPlayerProps = {
  src: string;
  fill?: boolean;
};

export default function StreamPlayer({ src, fill = false }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError('');
    let hls: Hls | null = null;

    const startPlayback = () => {
      void video.play().catch(() => {
        // Autoplay may require mute — already muted
      });
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }

        setError('Stream could not load. Check OBS is live and try refreshing.');
        hls?.destroy();
      });

      return () => {
        hls?.destroy();
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', startPlayback);
      return () => {
        video.removeEventListener('loadedmetadata', startPlayback);
        video.removeAttribute('src');
        video.load();
      };
    }

    setError('This browser does not support live stream playback.');
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black ${
        fill
          ? 'h-full min-h-0 rounded-none border-0'
          : 'rounded-2xl border-2 border-red-600 shadow-2xl sm:rounded-3xl sm:border-4'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        className={`h-full w-full bg-black ${fill ? 'min-h-0' : 'aspect-video'}`}
      />

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <p className="mb-2 text-lg font-semibold text-white">Stream unavailable</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      )}
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
