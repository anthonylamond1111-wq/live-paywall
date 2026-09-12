/** HLS source — Cloudflare Stream account. Override with STREAM_URL in Railway. */
const DEFAULT_STREAM_URL =
  'https://customer-73sqkglr4jzrnjf4.cloudflarestream.com/7e4c2b36fe4afecafc1469f1d3e4b20c/manifest/video.m3u8';

const LEGACY_STREAM_HOSTS = [
  'customer-3gbpbuevsi4kojvq',
  'customer-q44h5snfqbxzias7',
];

export function getStreamUrl(): string {
  const configured = process.env.STREAM_URL ?? DEFAULT_STREAM_URL;

  if (LEGACY_STREAM_HOSTS.some((host) => configured.includes(host))) {
    return DEFAULT_STREAM_URL;
  }

  return configured;
}

/** Browser-facing URL — proxied through our API for reliable HLS playback */
export const PLAYER_STREAM_URL = '/api/hls/playlist';

export const PREVIEW_SECONDS = 60;

export function formatPreviewDuration(short = false): string {
  if (PREVIEW_SECONDS >= 60 && PREVIEW_SECONDS % 60 === 0) {
    const mins = PREVIEW_SECONDS / 60;
    return short ? `${mins} min` : `${mins}-minute`;
  }
  return short ? `${PREVIEW_SECONDS} sec` : `${PREVIEW_SECONDS}-second`;
}

export const CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live';

/** Google Analytics — override with NEXT_PUBLIC_GA_MEASUREMENT_ID in Railway if needed */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-RYZHE1TV8D';

/** Intro splash sound — drop your file at public/sounds/intro.mp3 (or set NEXT_PUBLIC_INTRO_SOUND) */
export const INTRO_SOUND_URL =
  process.env.NEXT_PUBLIC_INTRO_SOUND ?? '/sounds/intro.mp3';

export const INTRO_SOUND_VOLUME = Math.min(
  1,
  Math.max(0, Number(process.env.NEXT_PUBLIC_INTRO_SOUND_VOLUME ?? '0.85'))
);

/** Max HLS quality height on desktop — default 1080p */
export const MAX_STREAM_HEIGHT = Math.max(
  360,
  Number(process.env.NEXT_PUBLIC_MAX_STREAM_HEIGHT ?? '1080')
);

/** Phones can reach 1080p when bandwidth allows; ABR keeps lower tiers available */
export const MOBILE_MAX_STREAM_HEIGHT = Math.max(
  360,
  Number(process.env.NEXT_PUBLIC_MOBILE_MAX_STREAM_HEIGHT ?? '1080')
);
