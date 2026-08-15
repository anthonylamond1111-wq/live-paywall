/** HLS source — new Cloudflare Stream account. Override with STREAM_URL in Railway. */
const DEFAULT_STREAM_URL =
  'https://customer-q44h5snfqbxzias7.cloudflarestream.com/d1cf1e4008d8c121f8f1ae2fa4f89bd7/manifest/video.m3u8';

export function getStreamUrl(): string {
  const configured = process.env.STREAM_URL ?? DEFAULT_STREAM_URL;

  // Ignore the old Cloudflare account playback URL after the switch.
  if (configured.includes('customer-3gbpbuevsi4kojvq')) {
    return DEFAULT_STREAM_URL;
  }

  return configured;
}

/** Browser-facing URL — proxied through our API for reliable HLS playback */
export const PLAYER_STREAM_URL = '/api/hls/playlist';

export const PREVIEW_SECONDS = 60;

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

/** Phones stay on 720p — much smoother on mobile data */
export const MOBILE_MAX_STREAM_HEIGHT = Math.max(
  360,
  Number(process.env.NEXT_PUBLIC_MOBILE_MAX_STREAM_HEIGHT ?? '720')
);
