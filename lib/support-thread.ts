export const SUPPORT_THREAD_COOKIE = 'ufc_support_thread';

/** Keep the same visitor thread for months so history stays available. */
const THREAD_MAX_AGE = 60 * 60 * 24 * 180;

export function supportThreadCookieOptions(threadId: string) {
  return {
    name: SUPPORT_THREAD_COOKIE,
    value: threadId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: THREAD_MAX_AGE,
    path: '/',
  };
}
