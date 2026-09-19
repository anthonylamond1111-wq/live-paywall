import { createHmac, timingSafeEqual } from 'node:crypto';
import { findPaidStripeSessionForUser, type AccessUser } from '@/lib/supabase/server';
import {
  accessCookieOptions,
  ACCESS_COOKIE,
} from '@/lib/access-cookie';
import {
  claimPaidDevice,
  DEVICE_TOKEN_COOKIE,
  deviceTokenCookieOptions,
  isActivePaidDevice,
} from '@/lib/device-access';
import { getStripe } from '@/lib/stripe';
import { isCurrentStreamPayment } from '@/lib/stream-access';
import { sessionEmail } from '@/lib/supabase/server';

export const STREAM_GRANT_COOKIE = 'ufc_stream_grant';

const TTL_SECONDS = 60 * 60 * 48;

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

type CookieResponse = {
  cookies: {
    set: (
      options:
        | ReturnType<typeof accessCookieOptions>
        | ReturnType<typeof deviceTokenCookieOptions>
        | ReturnType<typeof streamGrantCookieOptions>
    ) => void;
  };
};

/** Set paid-access cookies and rotate the active device for this email. */
export async function attachPaidAccessCookies(
  response: CookieResponse,
  options: {
    stripeSessionId: string;
    email: string;
    userId?: string | null;
  }
) {
  const { stripeSessionId, email, userId } = options;
  response.cookies.set(accessCookieOptions(stripeSessionId));

  const deviceToken = await claimPaidDevice(email, stripeSessionId);
  if (deviceToken) {
    response.cookies.set(deviceTokenCookieOptions(deviceToken));
  }

  if (userId) {
    response.cookies.set(streamGrantCookieOptions(userId));
  }
}

/** Set cookies so native HLS (Safari) can auth without Authorization headers. */
export async function attachStreamAccessCookies(
  response: CookieResponse,
  user: AccessUser
) {
  response.cookies.set(streamGrantCookieOptions(user.id));

  const stripeSession = await findPaidStripeSessionForUser(user);
  if (stripeSession && user.email) {
    await attachPaidAccessCookies(response, {
      stripeSessionId: stripeSession.id,
      email: user.email,
      userId: user.id,
    });
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
  if (!sessionId || !sessionId.startsWith('cs_')) return false;

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== 'paid' ||
      !isCurrentStreamPayment(session.created)
    ) {
      return false;
    }

    const email = sessionEmail(session);
    if (!email) return false;

    const deviceToken = parseCookieValue(cookieHeader, DEVICE_TOKEN_COOKIE);
    return isActivePaidDevice(email, deviceToken);
  } catch {
    return false;
  }
}
