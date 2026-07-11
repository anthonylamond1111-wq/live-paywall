import type { Level } from 'hls.js';
import { MAX_STREAM_HEIGHT } from '@/lib/constants';
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

export function getMaxAutoLevelIndex(levels: Level[]): number {
  return pickLevelByHeight(levels, MAX_STREAM_HEIGHT, true);
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
    backBufferLength: 20,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 8,
    maxLiveSyncPlaybackRate: 1,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 50 * 1000 * 1000,
    maxBufferHole: 0.5,
    capLevelToPlayerSize: true,
    capLevelOnFPSDrop: true,
    testBandwidth: true,
    abrEwmaDefaultEstimate: isMobileDevice() ? 1_800_000 : 2_500_000,
    abrBandWidthFactor: 0.85,
    abrBandWidthUpFactor: 0.6,
    abrMaxWithRealBitrate: true,
    fragLoadingMaxRetry: 8,
    manifestLoadingMaxRetry: 4,
    startFragPrefetch: true,
  };
}

export function getSafeStartLevel(levels: Level[]): number {
  const target = isMobileDevice() ? 480 : 720;
  return pickLevelByHeight(levels, Math.min(target, MAX_STREAM_HEIGHT), true);
}

/** Drop renditions above MAX_STREAM_HEIGHT from a multivariant master playlist. */
export function capPlaylistResolutions(body: string, maxHeight: number): string {
  const lines = body.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('#EXT-X-STREAM-INF') && line.includes('RESOLUTION=')) {
      const heightMatch = line.match(/RESOLUTION=\d+x(\d+)/);
      const height = heightMatch ? Number(heightMatch[1]) : 0;
      if (height > maxHeight) {
        const next = lines[i + 1]?.trim();
        if (next && !next.startsWith('#')) i += 1;
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}
