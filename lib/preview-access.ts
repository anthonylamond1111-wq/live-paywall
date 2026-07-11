import { PREVIEW_SECONDS } from '@/lib/constants';

export const PREVIEW_SESSION_COOKIE = 'ufc_preview_session';
export const PREVIEW_START_COOKIE = 'ufc_preview_start';

const PREVIEW_SESSION_MAX_AGE = 60 * 60 * 4;

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.split('=')[1] ?? '');
}

export function hasPreviewSession(cookieHeader: string | null): boolean {
  return readCookieValue(cookieHeader, PREVIEW_SESSION_COOKIE) === '1';
}

export function getPreviewStartFromCookie(
  cookieHeader: string | null
): number | null {
  const value = readCookieValue(cookieHeader, PREVIEW_START_COOKIE);
  if (!value) return null;

  const startedAt = Number(value);
  return Number.isFinite(startedAt) ? startedAt : null;
}

export function getPreviewRemainingSeconds(startedAt: number): number {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, PREVIEW_SECONDS - elapsed);
}

export function isPreviewActive(cookieHeader: string | null): boolean {
  const startedAt = getPreviewStartFromCookie(cookieHeader);
  if (!startedAt) return false;
  return getPreviewRemainingSeconds(startedAt) > 0;
}

export function canAccessPreviewStream(cookieHeader: string | null): boolean {
  if (!hasPreviewSession(cookieHeader)) return false;

  const startedAt = getPreviewStartFromCookie(cookieHeader);
  if (!startedAt) return true;

  return getPreviewRemainingSeconds(startedAt) > 0;
}

export function previewSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: PREVIEW_SESSION_MAX_AGE,
    path: '/',
  };
}

export function previewStartCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: PREVIEW_SECONDS + 60,
    path: '/',
  };
}
