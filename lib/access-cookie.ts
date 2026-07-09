import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe';

export const ACCESS_COOKIE = 'ufc_stream_access';

export async function getAccessSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function hasPaidAccess(sessionId?: string | null): Promise<boolean> {
  const id = sessionId ?? (await getAccessSessionId());
  if (!id || !id.startsWith('cs_')) return false;

  try {
    const session = await getStripe().checkout.sessions.retrieve(id);
    return session.payment_status === 'paid';
  } catch {
    return false;
  }
}

export function accessCookieOptions(sessionId: string) {
  return {
    name: ACCESS_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 12,
    path: '/',
  };
}
