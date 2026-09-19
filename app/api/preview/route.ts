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
  const startedAt = getPreviewStartFromCookie(cookieHeader);
  const remaining = startedAt
    ? getPreviewRemainingSeconds(startedAt)
    : PREVIEW_SECONDS;
  const expired = Boolean(startedAt && remaining <= 0);

  const origin = getRequestOrigin(request);
  const response = NextResponse.json({
    url: `${origin}${getHlsPlaylistPath()}`,
    seconds: expired ? 0 : remaining,
    started: Boolean(startedAt),
    expired,
  });

  if (!hasPreviewSession(cookieHeader)) {
    response.cookies.set(PREVIEW_SESSION_COOKIE, '1', previewSessionCookieOptions());
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
      url: previewPlaylistUrl(request),
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
  });

  response.cookies.set(PREVIEW_START_COOKIE, String(startedAt), previewStartCookieOptions());

  return response;
}
