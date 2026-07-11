type VideoWithCast = HTMLVideoElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  remote?: RemotePlayback;
};

export type CastMethod = 'airplay' | 'remote' | 'none';

export function detectCastMethod(video: HTMLVideoElement | null): CastMethod {
  if (!video) return 'none';

  const v = video as VideoWithCast;
  if (typeof v.webkitShowPlaybackTargetPicker === 'function') return 'airplay';
  if (v.webkitSupportsPresentationMode?.('airplay')) return 'airplay';
  if (v.remote && typeof v.remote.prompt === 'function') return 'remote';

  return 'none';
}

/** Opens the system AirPlay / Chromecast picker tied to the live video. */
export async function promptCastToTv(
  video: HTMLVideoElement
): Promise<'airplay' | 'remote' | 'failed'> {
  if (video.paused) {
    try {
      await video.play();
    } catch {
      // Cast can still work if the stream is loaded.
    }
  }

  if (video.muted) {
    video.muted = false;
  }

  const v = video as VideoWithCast;

  if (typeof v.webkitShowPlaybackTargetPicker === 'function') {
    v.webkitShowPlaybackTargetPicker();
    return 'airplay';
  }

  if (v.webkitSupportsPresentationMode?.('airplay')) {
    v.webkitSetPresentationMode?.('airplay');
    return 'airplay';
  }

  if (v.remote?.prompt) {
    try {
      await v.remote.prompt();
      return 'remote';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}
