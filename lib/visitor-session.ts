export const VISITOR_COOKIE = 'ufc_visitor_id';

export function visitorCookieOptions(visitorId: string) {
  return {
    name: VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
    path: '/',
  };
}

export const ACTIVE_VISITOR_SECONDS = 45;
