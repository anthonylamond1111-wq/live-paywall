'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import StreamPlayer, { useStreamFullscreen } from '@/components/StreamPlayer';
import LiveChat from '@/components/LiveChat';
import EventBanner from '@/components/EventBanner';
import FightInfo from '@/components/FightInfo';
import StreamOffline, { useStreamSchedule } from '@/components/StreamOffline';
import BrandLogo from '@/components/BrandLogo';
import ViewerCount from '@/components/ViewerCount';

type PlayerMode = 'normal' | 'theatre' | 'fullscreen';
type MobileTab = 'watch' | 'chat';

type StreamViewProps = {
  session: Session;
  streamUrl: string;
  onBackToHome: () => void;
};

export default function StreamView({ session, streamUrl, onBackToHome }: StreamViewProps) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('normal');
  const [mobileTab, setMobileTab] = useState<MobileTab>('watch');
  const [viewerCount, setViewerCount] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const { isBeforeStart } = useStreamSchedule();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const { enter: enterNativeFullscreen, exit: exitNativeFullscreen } =
    useStreamFullscreen(fullscreenRef);

  const handleEnterFullscreen = async () => {
    const entered = await enterNativeFullscreen();
    setPlayerMode(entered ? 'fullscreen' : 'fullscreen');
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
      if (!document.fullscreenElement) {
        setPlayerMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [playerMode]);

  const isFullscreen = playerMode === 'fullscreen';
  const isTheatre = playerMode === 'theatre';
  const showOfflinePlaceholder = isBeforeStart;
  const showWaiting = !isBeforeStart && !isLive;

  const statusLabel = isBeforeStart
    ? 'Stream has not started yet'
    : isLive
      ? 'Live broadcast in progress'
      : 'Waiting for broadcast';

  return (
    <div
      ref={fullscreenRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
          : 'space-y-3 sm:space-y-4'
      }
    >
      {!isFullscreen && (
        <>
          <EventBanner compact showLive={isLive} />
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
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
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
        <div className="flex shrink-0 items-center justify-between border-b border-red-600/40 bg-black/90 px-4 py-3">
          <BrandLogo size="fullscreen" />
          <button
            type="button"
            onClick={handleExitFullscreen}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 sm:text-sm"
          >
            Exit fullscreen
          </button>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? 'min-h-0 flex-1'
            : isTheatre
              ? 'mx-auto w-full max-w-6xl space-y-4'
              : 'flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_340px] lg:gap-6'
        }
      >
        <div
          className={`min-w-0 ${
            isFullscreen
              ? 'h-full min-h-0'
              : mobileTab === 'chat'
                ? 'hidden lg:block'
                : ''
          }`}
        >
          {showOfflinePlaceholder ? (
            <StreamOffline variant="scheduled" fill={isFullscreen} />
          ) : (
            <StreamPlayer
              src={streamUrl}
              fill={isFullscreen}
              onLiveChange={setIsLive}
              onRequestFullscreen={isFullscreen ? undefined : handleEnterFullscreen}
            />
          )}
        </div>

        {!isFullscreen && (
          <div
            className={`min-h-0 ${
              isTheatre
                ? 'mx-auto w-full max-w-3xl'
                : mobileTab === 'watch'
                  ? 'hidden lg:block'
                  : ''
            }`}
          >
            {showOfflinePlaceholder || showWaiting ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 text-center sm:h-80 lg:h-[min(70vh,520px)]">
                <p className="text-sm font-semibold text-gray-300">Chat opens when the stream goes live</p>
                <p className="mt-2 text-xs text-gray-500">
                  {isBeforeStart
                    ? 'Come back at the scheduled start time.'
                    : 'Hang tight — the broadcast should begin shortly.'}
                </p>
              </div>
            ) : (
              <LiveChat session={session} viewerCount={viewerCount} />
            )}
          </div>
        )}
      </div>

      {!isFullscreen && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-black/95 backdrop-blur-md lg:hidden">
            <div className="flex">
              <button
                type="button"
                onClick={() => setMobileTab('watch')}
                className={`flex-1 py-3 text-sm font-semibold ${
                  mobileTab === 'watch' ? 'text-red-400' : 'text-gray-500'
                }`}
              >
                Watch
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-3 text-sm font-semibold ${
                  mobileTab === 'chat' ? 'text-red-400' : 'text-gray-500'
                }`}
              >
                Chat
              </button>
            </div>
          </div>
          <div className="h-14 lg:hidden" />

          <FightInfo />
        </>
      )}
    </div>
  );
}
