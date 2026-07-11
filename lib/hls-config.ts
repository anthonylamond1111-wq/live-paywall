import type { Level } from 'hls.js';
import { MAX_STREAM_HEIGHT, MOBILE_MAX_STREAM_HEIGHT } from '@/lib/constants';
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

export function getEffectiveMaxHeight(): number {
  return isMobileDevice() ? MOBILE_MAX_STREAM_HEIGHT : MAX_STREAM_HEIGHT;
}

export function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|ipod|mobile|webos|blackberry|iemobile|opera mini/i.test(
    userAgent
  );
}

export function getMaxLevelIndex(levels: Level[], maxHeight: number): number {
  let best = 0;
  for (let i = 0; i < levels.length; i++) {
    const height = levels[i].height ?? 0;
    if (height <= maxHeight && height >= (levels[best].height ?? 0)) {
      best = i;
    }
  }
  return best;
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
  const mobile = isMobileDevice();
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 25,
    liveSyncDurationCount: 4,
    liveMaxLatencyDurationCount: 10,
    maxLiveSyncPlaybackRate: 1,
    maxBufferLength: mobile ? 35 : 45,
    maxMaxBufferLength: mobile ? 60 : 80,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    capLevelToPlayerSize: mobile,
    capLevelOnFPSDrop: true,
    testBandwidth: true,
    abrEwmaDefaultEstimate: mobile ? 1_500_000 : 3_500_000,
    abrBandWidthFactor: 0.88,
    abrBandWidthUpFactor: 0.55,
    abrMaxWithRealBitrate: true,
    fragLoadingMaxRetry: 8,
    manifestLoadingMaxRetry: 4,
    startFragPrefetch: true,
  };
}

export function getSafeStartLevel(levels: Level[]): number {
  const maxHeight = getEffectiveMaxHeight();
  const target = isMobileDevice() ? 480 : 720;
  return pickLevelByHeight(levels, Math.min(target, maxHeight), true);
}

/** Desktop only — wait for a stable buffer before unlocking 1080p auto. */
export const DESKTOP_HD_RAMP_BUFFER_SECONDS = 18;

/** Drop renditions above maxHeight from a multivariant master playlist. */
export function capPlaylistResolutions(body: string, maxHeight: number): string {
  if (maxHeight >= 1080) return body;

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
