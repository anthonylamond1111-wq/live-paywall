export const STREAM_URL =
  process.env.STREAM_URL ??
  'https://livepeercdn.studio/hls/e3873tb0vudnbmle/index.m3u8';

/** Browser-facing URL — proxied through our API for reliable Livepeer playback */
export const PLAYER_STREAM_URL = '/api/hls/playlist';

export const PREVIEW_SECONDS = 60;

export const CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2 to Join Live';
