import type { Level } from 'hls.js';
import { isMobileDevice } from '@/lib/cast-to-tv';

/** Pick the level whose height is closest to target (prefer at-or-below when pickLower). */
export function pickLevelByHeight(
  levels: Level[],
  targetHeight: number,
  pickLower = true
): number {
  let bestIndex = 0;
  let bestScore = Infinity;

  for (let i = 0; i < levels.length; i++) {
    const height = levels[i].height ?? 0;
    if (pickLower && height > targetHeight) continue;

    const score = Math.abs(height - targetHeight);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestScore === Infinity) {
    return levels.reduce(
      (lowest, level, index) =>
        (level.height ?? 0) < (levels[lowest].height ?? Infinity) ? index : lowest,
      0
    );
  }

  return bestIndex;
}

export function getBufferedAheadSeconds(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  if (!buffered.length) return 0;

  for (let i = 0; i < buffered.length; i++) {
    if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
      return buffered.end(i) - currentTime;
    }
  }

  return buffered.end(buffered.length - 1) - currentTime;
}

export function createStreamHlsConfig() {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,
    liveSyncDurationCount: 4,
    liveMaxLatencyDurationCount: 10,
    maxLiveSyncPlaybackRate: 1.05,
    maxBufferLength: 40,
    maxMaxBufferLength: 80,
    maxBufferSize: 70 * 1000 * 1000,
    maxBufferHole: 0.5,
    capLevelToPlayerSize: false,
    capLevelOnFPSDrop: true,
    testBandwidth: true,
    abrEwmaDefaultEstimate: isMobileDevice() ? 2_500_000 : 5_000_000,
    abrBandWidthFactor: 0.92,
    abrBandWidthUpFactor: 0.72,
    abrMaxWithRealBitrate: true,
    fragLoadingMaxRetry: 6,
    manifestLoadingMaxRetry: 4,
  };
}

export function getSafeStartLevel(levels: Level[]): number {
  const target = isMobileDevice() ? 480 : 720;
  return pickLevelByHeight(levels, target, true);
}

export const QUALITY_RAMP_BUFFER_SECONDS = 10;
