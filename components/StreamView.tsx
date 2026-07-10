'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import StreamPlayer, { useStreamFullscreen } from '@/components/StreamPlayer';
import LiveChat from '@/components/LiveChat';
import EventBanner from '@/components/EventBanner';
import FightInfo from '@/components/FightInfo';
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
          <EventBanner compact showLive />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <div className="live-badge flex items-center gap-2 text-[10px] uppercase tracking-widest text-red-500 sm:text-sm">
                <span className="live-dot h-2 w-2 rounded-full bg-red-500 sm:h-3 sm:w-3" />
                Live broadcast in progress
              </div>
              <ViewerCount session={session} onCountChange={setViewerCount} />
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
          <span className="text-sm font-black tracking-tight sm:text-lg">UFC ACCESS</span>
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
          <StreamPlayer
            src={streamUrl}
            fill={isFullscreen}
            onRequestFullscreen={isFullscreen ? undefined : handleEnterFullscreen}
          />
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
            <LiveChat session={session} viewerCount={viewerCount} />
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
