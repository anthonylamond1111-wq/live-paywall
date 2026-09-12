import { createHmac, timingSafeEqual } from 'node:crypto';
import { findPaidStripeSessionForUser, type AccessUser } from '@/lib/supabase/server';
import { accessCookieOptions, ACCESS_COOKIE, hasPaidAccess } from '@/lib/access-cookie';

export const STREAM_GRANT_COOKIE = 'ufc_stream_grant';

const TTL_SECONDS = 60 * 60 * 12;

function getSecret() {
  return (
    process.env.STREAM_GRANT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'dev-stream-grant-insecure'
  );
}

function signGrant(userId: string, expiresAt: number) {
  return createHmac('sha256', getSecret())
    .update(`${userId}:${expiresAt}`)
    .digest('base64url');
}

export function createStreamGrantValue(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const mac = signGrant(userId, expiresAt);
  return `${userId}.${expiresAt}.${mac}`;
}

export function isValidStreamGrant(value: string | null | undefined): boolean {
  if (!value) return false;

  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [userId, expStr, mac] = parts;
  const expiresAt = Number(expStr);
  if (!userId || !mac || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = signGrant(userId, expiresAt);
  try {
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function streamGrantCookieOptions(userId: string) {
  return {
    name: STREAM_GRANT_COOKIE,
    value: createStreamGrantValue(userId),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: TTL_SECONDS,
    path: '/',
  };
}

/** Set cookies so native HLS (Safari) can auth without Authorization headers. */
export async function attachStreamAccessCookies(
  response: { cookies: { set: (options: ReturnType<typeof accessCookieOptions>) => void } },
  user: AccessUser
) {
  response.cookies.set(streamGrantCookieOptions(user.id));

  const stripeSession = await findPaidStripeSessionForUser(user);
  if (stripeSession) {
    response.cookies.set(accessCookieOptions(stripeSession.id));
  }
}

export function hasStreamGrantFromCookieHeader(cookieHeader: string | null): boolean {
  const grant = parseCookieValue(cookieHeader, STREAM_GRANT_COOKIE);
  return isValidStreamGrant(grant);
}

export async function hasStripeAccessFromCookieHeader(
  cookieHeader: string | null
): Promise<boolean> {
  const sessionId = parseCookieValue(cookieHeader, ACCESS_COOKIE);
  return hasPaidAccess(sessionId);
}
