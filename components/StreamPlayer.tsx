'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { hasStreamStarted } from '@/lib/event';
import type { StreamHealthStatus } from '@/components/StreamHealth';
import CastToTvButton from '@/components/CastToTvButton';
import { detectCastMethod, isMobileDevice } from '@/lib/cast-to-tv';

type QualityLevel = {
  index: number;
  label: string;
};

type StreamPlayerProps = {
  src: string;
  fill?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  accessToken?: string | null;
  onRequestFullscreen?: () => void;
  onLiveChange?: (live: boolean) => void;
  onHealthChange?: (status: StreamHealthStatus) => void;
  showCastButton?: boolean;
};

function assignVideoRef(
  node: HTMLVideoElement | null,
  internalRef: React.RefObject<HTMLVideoElement | null>,
  externalRef?: React.RefObject<HTMLVideoElement | null>
) {
  internalRef.current = node;
  if (externalRef) {
    externalRef.current = node;
  }
}

export default function StreamPlayer({
  src,
  fill = false,
  videoRef: externalVideoRef,
  accessToken,
  onRequestFullscreen,
  onLiveChange,
  onHealthChange,
  showCastButton = false,
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLiveRef = useRef(false);

  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('Stream unavailable');
  const [reconnectToken, setReconnectToken] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showUnmute, setShowUnmute] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showControls, setShowControls] = useState(true);
  const [pipSupported, setPipSupported] = useState(false);
  const [castVisible, setCastVisible] = useState(false);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const triggerReconnect = useCallback(() => {
    setReconnecting(true);
    setReconnectToken((current) => current + 1);
  }, []);

  const markLive = useCallback(() => {
    wasLiveRef.current = true;
    setReconnecting(false);
    setError('');
    onLiveChange?.(true);
    onHealthChange?.('good');
  }, [onHealthChange, onLiveChange]);

  const showStreamError = useCallback(
    (title: string, message: string) => {
      onLiveChange?.(false);
      onHealthChange?.(wasLiveRef.current ? 'buffering' : 'offline');
      setErrorTitle(title);
      setError(message);
      setReconnecting(false);
    },
    [onHealthChange, onLiveChange]
  );

  useEffect(() => {
    setPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        document.pictureInPictureEnabled
    );
  }, []);

  useEffect(() => {
    if (!showCastButton) {
      setCastVisible(false);
      return;
    }

    const update = () => {
      const method = detectCastMethod(videoRef.current);
      setCastVisible(isMobileDevice() || method !== 'none');
    };

    update();
    const video = videoRef.current;
    video?.addEventListener('loadedmetadata', update);
    video?.addEventListener('canplay', update);

    return () => {
      video?.removeEventListener('loadedmetadata', update);
      video?.removeEventListener('canplay', update);
    };
  }, [showCastButton, src, reconnectToken]);

  useEffect(() => {
    wasLiveRef.current = false;
  }, [src]);

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

    const signalLiveIfPicture = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        markLive();
      }
    };

    const startPlayback = () => {
      void video.play().catch(() => {});
    };

    video.addEventListener('loadeddata', signalLiveIfPicture);
    video.addEventListener('playing', signalLiveIfPicture);

    const syncToLiveEdge = () => {
      if (!video || !Number.isFinite(video.duration)) return;
      const behindLive = video.duration - video.currentTime;
      if (behindLive > 6) {
        video.currentTime = Math.max(0, video.duration - 2);
      }
    };

    if (Hls.isSupported()) {
      const useProxy = src.includes('/api/hls/');
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 0,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        maxLiveSyncPlaybackRate: 1.25,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        xhrSetup: (xhr, url) => {
          if (useProxy && url.includes('/api/hls/')) {
            xhr.withCredentials = true;
            if (accessToken) {
              xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
            }
          }
        },
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const qualityLevels: QualityLevel[] = data.levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : `Level ${index + 1}`,
        }));
        setLevels(qualityLevels);
        setCurrentLevel(hls?.currentLevel ?? -1);
        hls?.startLoad(-1);
        startPlayback();
        setReconnecting(false);
      });

      hls.on(Hls.Events.FRAG_BUFFERED, syncToLiveEdge);

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          showStreamError(
            wasLiveRef.current
              ? 'Connection lost'
              : hasStreamStarted()
                ? 'Broadcast not live yet'
                : 'Stream has not started yet',
            wasLiveRef.current
              ? 'Tap reconnect below to try again.'
              : hasStreamStarted()
                ? 'The broadcast has not started yet. Tap reconnect when it goes live.'
                : 'The stream is not live yet. Check back at the scheduled start time.'
          );
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }

        showStreamError(
          wasLiveRef.current ? 'Connection lost' : 'Broadcast not live yet',
          wasLiveRef.current
            ? 'Playback stopped. Tap reconnect below to try again.'
            : 'The stream has not started. Tap reconnect when the broadcast goes live.'
        );
      });

      const liveSyncTimer = window.setInterval(syncToLiveEdge, 4000);

      return () => {
        window.clearInterval(liveSyncTimer);
        video.removeEventListener('loadeddata', signalLiveIfPicture);
        video.removeEventListener('playing', signalLiveIfPicture);
        hls?.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.crossOrigin = 'use-credentials';
      video.src = src;
      const onNativeMetadata = () => {
        startPlayback();
        syncToLiveEdge();
        setReconnecting(false);
      };
      const onNativeError = () => {
        showStreamError(
          wasLiveRef.current ? 'Connection lost' : 'Broadcast not live yet',
          wasLiveRef.current
            ? 'Playback stopped. Tap reconnect below to try again.'
            : 'Waiting for the broadcast. Tap reconnect when it goes live.'
        );
      };
      video.addEventListener('loadedmetadata', onNativeMetadata);
      video.addEventListener('error', onNativeError);
      const liveSyncTimer = window.setInterval(syncToLiveEdge, 4000);
      return () => {
        window.clearInterval(liveSyncTimer);
        video.removeEventListener('loadeddata', signalLiveIfPicture);
        video.removeEventListener('playing', signalLiveIfPicture);
        video.removeEventListener('loadedmetadata', onNativeMetadata);
        video.removeEventListener('error', onNativeError);
        video.removeAttribute('src');
        video.load();
      };
    }

    video.removeEventListener('loadeddata', signalLiveIfPicture);
    video.removeEventListener('playing', signalLiveIfPicture);
    setError('This browser does not support live stream playback.');
  }, [src, onLiveChange, onHealthChange, accessToken, reconnectToken, markLive, showStreamError]);

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
        ref={(node) => assignVideoRef(node, videoRef, externalVideoRef)}
        autoPlay
        muted
        playsInline
        disableRemotePlayback={false}
        {...({ 'x-webkit-airplay': 'allow' } as React.VideoHTMLAttributes<HTMLVideoElement>)}
        className={`h-full w-full bg-black ${
          fill ? 'min-h-0 object-cover' : 'aspect-video object-contain'
        }`}
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
          <div className="mt-5">
            <button
              type="button"
              onClick={triggerReconnect}
              disabled={reconnecting}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-60"
            >
              {reconnecting ? 'Reconnecting…' : 'Reconnect'}
            </button>
          </div>
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

          {castVisible && (
            <CastToTvButton videoRef={videoRef} variant="player" />
          )}

          <button
            type="button"
            onClick={triggerReconnect}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
            aria-label="Reconnect stream"
            title="Reconnect"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h5M20 20v-5h-5M20 4l-3.5 3.5a8 8 0 00-13 2M4 20l3.5-3.5a8 8 0 0113-2"
              />
            </svg>
          </button>

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

export function useStreamFullscreen(
  containerRef: React.RefObject<HTMLElement | null>,
  videoRef?: React.RefObject<HTMLVideoElement | null>
) {
  const enterVideoFullscreen = async () => {
    const video = videoRef?.current;
    if (!video) return false;

    try {
      const webkitVideo = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      if (webkitVideo.webkitEnterFullscreen) {
        webkitVideo.webkitEnterFullscreen();
        return true;
      }
      if (video.requestFullscreen) {
        await video.requestFullscreen();
        return true;
      }
      const webkitVideoEl = video as HTMLVideoElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (webkitVideoEl.webkitRequestFullscreen) {
        await webkitVideoEl.webkitRequestFullscreen();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const enterContainerFullscreen = async () => {
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
      return false;
    }
    return false;
  };

  const enter = async (preferVideo = false) => {
    if (preferVideo && (await enterVideoFullscreen())) {
      return true;
    }
    if (await enterContainerFullscreen()) {
      return true;
    }
    if (!preferVideo && (await enterVideoFullscreen())) {
      return true;
    }
    return false;
  };

  const exit = async () => {
    try {
      const webkitVideo = videoRef?.current as HTMLVideoElement & {
        webkitDisplayingFullscreen?: boolean;
        webkitExitFullscreen?: () => void;
      } | undefined;
      if (webkitVideo?.webkitDisplayingFullscreen && webkitVideo.webkitExitFullscreen) {
        webkitVideo.webkitExitFullscreen();
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Parent handles CSS overlay exit
    }
  };

  return { enter, exit };
}
