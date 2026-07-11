'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import StreamPlayer, { useStreamFullscreen } from '@/components/StreamPlayer';
import LiveChat from '@/components/LiveChat';
import FightInfo from '@/components/FightInfo';
import StreamOffline, { useStreamSchedule } from '@/components/StreamOffline';
import BrandLogo from '@/components/BrandLogo';
import ViewerCount from '@/components/ViewerCount';
import TaleOfTheTape from '@/components/TaleOfTheTape';
import CastToTvButton from '@/components/CastToTvButton';
import StreamHealth, { type StreamHealthStatus } from '@/components/StreamHealth';
import LiveUpdateBanner from '@/components/LiveUpdateBanner';
import ShareButton from '@/components/ShareButton';
import { LANDING_FUNNEL_WIDTH } from '@/components/LandingFunnel';

type PlayerMode = 'normal' | 'theatre' | 'fullscreen';

type StreamViewProps = {
  session: Session;
  streamUrl: string;
  onBackToHome: () => void;
};

export default function StreamView({ session, streamUrl, onBackToHome }: StreamViewProps) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('normal');
  const [viewerCount, setViewerCount] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [health, setHealth] = useState<StreamHealthStatus>('offline');
  const { isBeforeStart } = useStreamSchedule();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { enter: enterNativeFullscreen, exit: exitNativeFullscreen } =
    useStreamFullscreen(fullscreenRef, videoRef);

  const handleEnterFullscreen = async () => {
    const preferVideo =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;
    const entered = await enterNativeFullscreen(preferVideo);
    if (!entered || !preferVideo) {
      setPlayerMode('fullscreen');
    }
  };

  const handleExitFullscreen = async () => {
    await exitNativeFullscreen();
    setPlayerMode('normal');
  };

  const toggleTheatre = () => {
    setPlayerMode((m) => (m === 'theatre' ? 'normal' : 'theatre'));
  };

  useEffect(() => {
    if (playerMode !== 'fullscreen') return;

    document.body.style.overflow = 'hidden';

    const onFullscreenChange = () => {
      const webkitVideo = videoRef.current as HTMLVideoElement & {
        webkitDisplayingFullscreen?: boolean;
      } | null;
      if (!document.fullscreenElement && !webkitVideo?.webkitDisplayingFullscreen) {
        setPlayerMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    const video = videoRef.current;
    video?.addEventListener('webkitbeginfullscreen', onFullscreenChange);
    video?.addEventListener('webkitendfullscreen', onFullscreenChange);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      video?.removeEventListener('webkitbeginfullscreen', onFullscreenChange);
      video?.removeEventListener('webkitendfullscreen', onFullscreenChange);
    };
  }, [playerMode]);

  const isFullscreen = playerMode === 'fullscreen';
  const isTheatre = playerMode === 'theatre';

  const statusLabel = isLive
    ? 'Live broadcast in progress'
    : isBeforeStart
      ? 'Stream has not started yet'
      : 'Waiting for broadcast';

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col bg-black'
          : 'space-y-3 sm:space-y-4'
      }
    >
      {!isFullscreen && (
        <>
          <LiveUpdateBanner />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <div
                className={`flex items-center gap-2 text-[10px] uppercase tracking-widest sm:text-sm ${
                  isLive ? 'live-badge text-red-500' : 'text-gray-500'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full sm:h-3 sm:w-3 ${
                    isLive
                      ? 'live-dot bg-red-500'
                      : isBeforeStart
                        ? 'bg-zinc-600'
                        : 'animate-pulse bg-amber-500'
                  }`}
                />
                {statusLabel}
              </div>
              {isLive && <ViewerCount session={session} onCountChange={setViewerCount} />}
              {isLive && <StreamHealth status={health} />}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <ShareButton />
              <CastToTvButton videoRef={videoRef} variant="toolbar" />
              <button
                type="button"
                onClick={onBackToHome}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 sm:text-sm"
              >
                Back to home
              </button>
              <button
                type="button"
                onClick={toggleTheatre}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  isTheatre
                    ? 'border-red-500 bg-red-500/10 text-red-300'
                    : 'border-zinc-700 text-gray-300 hover:border-red-500'
                }`}
              >
                Theatre
              </button>
              <button
                type="button"
                onClick={handleEnterFullscreen}
                className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black sm:text-sm"
              >
                Fullscreen
              </button>
            </div>
          </div>
        </>
      )}

      {isFullscreen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-[max(0.75rem,env(safe-area-inset-top))_1rem_2rem]">
          <BrandLogo size="fullscreen" />
          <button
            type="button"
            onClick={handleExitFullscreen}
            className="pointer-events-auto rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:text-sm"
          >
            Exit
          </button>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? 'relative min-h-0 flex-1'
            : isTheatre
              ? 'mx-auto w-full max-w-6xl space-y-4'
              : `${LANDING_FUNNEL_WIDTH} flex flex-col gap-4`
        }
      >
        <div
          className={`relative min-w-0 ${
            isFullscreen ? 'h-full min-h-0' : ''
          }`}
        >
          <StreamPlayer
            src={streamUrl}
            fill={isFullscreen}
            videoRef={videoRef}
            accessToken={session.access_token}
            showCastButton
            onLiveChange={setIsLive}
            onHealthChange={setHealth}
            onRequestFullscreen={isFullscreen ? undefined : handleEnterFullscreen}
          />
          {!isLive && (
            <div
              className={`absolute inset-0 z-10 overflow-hidden ${
                isFullscreen ? 'rounded-none' : 'rounded-2xl sm:rounded-3xl'
              }`}
            >
              <StreamOffline
                variant={isBeforeStart ? 'scheduled' : 'waiting'}
                fill={isFullscreen}
              />
            </div>
          )}
        </div>

        {!isFullscreen && (
          <div className="sm:hidden">
            <CastToTvButton videoRef={videoRef} variant="prominent" />
          </div>
        )}

        {!isFullscreen && (
          <div className={isTheatre ? 'mx-auto w-full max-w-3xl' : 'w-full'}>
            <LiveChat
              session={session}
              viewerCount={viewerCount}
              streamLive={isLive}
              beforeStreamStart={!isLive}
            />
          </div>
        )}
      </div>

      {!isFullscreen && (
        <>
          <div className={LANDING_FUNNEL_WIDTH}>
            <TaleOfTheTape />
          </div>

          <div className={LANDING_FUNNEL_WIDTH}>
            <FightInfo />
          </div>
        </>
      )}
    </div>
  );
}
