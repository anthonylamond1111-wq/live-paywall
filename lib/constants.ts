export const STREAM_URL =
  process.env.STREAM_URL ??
  'https://livepeercdn.studio/hls/7d50dwagchjrclo2/index.m3u8';

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';

export const CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay to Join Live';
