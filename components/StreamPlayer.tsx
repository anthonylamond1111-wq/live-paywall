'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { hasStreamStarted } from '@/lib/event';
import type { StreamHealthStatus } from '@/components/StreamHealth';

type QualityLevel = {
  index: number;
  label: string;
};

type StreamPlayerProps = {
  src: string;
  fill?: boolean;
  onRequestFullscreen?: () => void;
  onLiveChange?: (live: boolean) => void;
  onHealthChange?: (status: StreamHealthStatus) => void;
};

export default function StreamPlayer({ src, fill = false, onRequestFullscreen, onLiveChange, onHealthChange }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('Stream unavailable');
  const [muted, setMuted] = useState(true);
  const [showUnmute, setShowUnmute] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showControls, setShowControls] = useState(true);
  const [pipSupported, setPipSupported] = useState(false);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    setPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        document.pictureInPictureEnabled
    );
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError('');
    setErrorTitle('Stream unavailable');
    onLiveChange?.(false);
    onHealthChange?.('offline');
    setShowUnmute(true);
    setMuted(true);
    video.muted = true;

    let hls: Hls | null = null;

    const startPlayback = () => {
      void video.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setError('');
        onLiveChange?.(true);
        onHealthChange?.('good');
        const qualityLevels: QualityLevel[] = data.levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : `Level ${index + 1}`,
        }));
        setLevels(qualityLevels);
        setCurrentLevel(hls?.currentLevel ?? -1);
        startPlayback();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          onLiveChange?.(false);
          onHealthChange?.('buffering');
          setErrorTitle(hasStreamStarted() ? 'Broadcast not live yet' : 'Stream has not started yet');
          setError(
            hasStreamStarted()
              ? 'Waiting for the broadcast to begin. This page will connect automatically.'
              : 'The stream is not live yet. Check back at the scheduled start time.'
          );
          hls?.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }

        onLiveChange?.(false);
        onHealthChange?.('offline');
        setErrorTitle('Broadcast not live yet');
        setError('The stream has not started. Refresh this page when the broadcast goes live.');
        hls?.destroy();
      });

      return () => {
        hls?.destroy();
        hlsRef.current = null;
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
  }, [src, onLiveChange, onHealthChange]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    setShowUnmute(false);
    void video.play().catch(() => {});
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted) setShowUnmute(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not available
    }
  };

  return (
    <div
      className={`group relative w-full overflow-hidden bg-black ${
        fill
          ? 'h-full min-h-0 rounded-none border-0'
          : 'rounded-2xl border-2 border-red-600 shadow-2xl shadow-red-900/20 sm:rounded-3xl sm:border-4'
      }`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`h-full w-full bg-black ${fill ? 'min-h-0 object-contain' : 'aspect-video object-contain'}`}
        onPlay={() => {
          setPlaying(true);
          onHealthChange?.('good');
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => onHealthChange?.('buffering')}
        onPlaying={() => onHealthChange?.('good')}
        onClick={togglePlay}
      />

      {showUnmute && !error && (
        <button
          type="button"
          onClick={handleUnmute}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] transition hover:bg-black/40"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-white/10">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-9-6a9 9 0 0118 0 9 9 0 01-18 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5L6 9H3v6h3l5 4V5z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold text-white">Tap to unmute</p>
          <p className="mt-1 text-xs text-gray-400">Live audio is muted until you enable it</p>
        </button>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <p className="mb-2 text-lg font-semibold text-white">{errorTitle}</p>
          <p className="text-sm text-gray-400">{error}</p>
          {errorTitle.includes('not live') && (
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              Checking for signal…
            </div>
          )}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-4 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-9-6a9 9 0 0118 0 9 9 0 01-18 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H3v6h3l5 4V5z" />
              </svg>
            )}
          </button>

          <div className="flex-1" />

          {levels.length > 1 && (
            <select
              value={currentLevel}
              onChange={(e) => handleQualityChange(Number(e.target.value))}
              className="rounded-lg border border-white/20 bg-black/60 px-2 py-1.5 text-xs text-white outline-none"
              aria-label="Stream quality"
            >
              <option value={-1}>Auto</option>
              {levels.map((level) => (
                <option key={level.index} value={level.index}>
                  {level.label}
                </option>
              ))}
            </select>
          )}

          {pipSupported && (
            <button
              type="button"
              onClick={handlePiP}
              className="rounded-lg p-2 text-white transition hover:bg-white/10"
              aria-label="Picture in picture"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10" />
              </svg>
            </button>
          )}

          {onRequestFullscreen && (
            <button
              type="button"
              onClick={onRequestFullscreen}
              className="rounded-lg p-2 text-white transition hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
      </div>
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
