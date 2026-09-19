import { NextResponse } from 'next/server';
import { getHlsPlaylistPath } from '@/lib/hls-access';
import { PREVIEW_SECONDS } from '@/lib/constants';
import {
  getPreviewRemainingSeconds,
  getPreviewStartFromCookie,
  hasPreviewSession,
  PREVIEW_SESSION_COOKIE,
  PREVIEW_START_COOKIE,
  previewSessionCookieOptions,
  previewStartCookieOptions,
} from '@/lib/preview-access';

export const dynamic = 'force-dynamic';

function getRequestOrigin(request: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return new URL(request.url).origin;
}

function previewPlaylistUrl(request: Request): string {
  const origin = getRequestOrigin(request);
  return `${origin}${getHlsPlaylistPath()}`;
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const existingStart = getPreviewStartFromCookie(cookieHeader);

  // Hard cut: once the free window has ended, never hand out a playable URL again.
  if (existingStart && getPreviewRemainingSeconds(existingStart) <= 0) {
    const response = NextResponse.json({
      seconds: 0,
      started: true,
      expired: true,
    });
    if (!hasPreviewSession(cookieHeader)) {
      response.cookies.set(PREVIEW_SESSION_COOKIE, '1', previewSessionCookieOptions());
    }
    return response;
  }

  // Start the 90s clock on first preview load (not when "live" is detected).
  const startedAt = existingStart ?? Date.now();
  const remaining = existingStart
    ? getPreviewRemainingSeconds(existingStart)
    : PREVIEW_SECONDS;

  const response = NextResponse.json({
    url: previewPlaylistUrl(request),
    seconds: remaining,
    started: true,
    expired: false,
  });

  if (!hasPreviewSession(cookieHeader)) {
    response.cookies.set(PREVIEW_SESSION_COOKIE, '1', previewSessionCookieOptions());
  }
  if (!existingStart) {
    response.cookies.set(PREVIEW_START_COOKIE, String(startedAt), previewStartCookieOptions());
  }

  return response;
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie');

  if (!hasPreviewSession(cookieHeader)) {
    return NextResponse.json({ error: 'Preview session required' }, { status: 403 });
  }

  const existingStart = getPreviewStartFromCookie(cookieHeader);
  if (existingStart) {
    const remaining = getPreviewRemainingSeconds(existingStart);
    const expired = remaining <= 0;

    return NextResponse.json({
      url: expired ? undefined : previewPlaylistUrl(request),
      seconds: expired ? 0 : remaining,
      started: true,
      expired,
    });
  }

  const startedAt = Date.now();
  const response = NextResponse.json({
    url: previewPlaylistUrl(request),
    seconds: PREVIEW_SECONDS,
    started: true,
    expired: false,
  });

  response.cookies.set(PREVIEW_START_COOKIE, String(startedAt), previewStartCookieOptions());

  return response;
}
