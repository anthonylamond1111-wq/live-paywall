export const SUPPORT_THREAD_COOKIE = 'ufc_support_thread';

export function supportThreadCookieOptions(threadId: string) {
  return {
    name: SUPPORT_THREAD_COOKIE,
    value: threadId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 3,
    path: '/',
  };
}
