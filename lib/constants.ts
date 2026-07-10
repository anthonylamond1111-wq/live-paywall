/** HLS source URL — set STREAM_URL in Railway (Cloudflare, Mux, etc.) */
export function getStreamUrl(): string {
  if (process.env.STREAM_URL) {
    return process.env.STREAM_URL;
  }

  const playbackId = process.env.LIVEPEER_PLAYBACK_ID;
  if (playbackId) {
    return `https://livepeercdn.studio/hls/${playbackId}/index.m3u8`;
  }

  return '';
}

/** Browser-facing URL — proxied through our API for reliable HLS playback */
export const PLAYER_STREAM_URL = '/api/hls/playlist';

export const PREVIEW_SECONDS = 60;

export const CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live';
