import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase/server';
import { isMultiDeviceEmail } from '@/lib/single-device-auth';

export const DEVICE_TOKEN_COOKIE = 'ufc_device_token';

const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 48;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function deviceTokenCookieOptions(token: string) {
  return {
    name: DEVICE_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: '/',
  };
}

/** Issue a new device token and invalidate any previous device for this email. */
export async function claimPaidDevice(
  email: string,
  stripeSessionId: string
): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const normalized = normalizeEmail(email);
  if (!normalized || !stripeSessionId.startsWith('cs_')) return null;

  if (isMultiDeviceEmail(normalized)) {
    return crypto.randomUUID();
  }

  const deviceToken = crypto.randomUUID();
  const { error } = await supabase.from('paid_device_access').upsert(
    {
      email: normalized,
      stripe_session_id: stripeSessionId,
      device_token: deviceToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('claimPaidDevice error:', error.message);
    return null;
  }

  return deviceToken;
}

export async function isActivePaidDevice(
  email: string,
  deviceToken: string | null | undefined
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  if (isMultiDeviceEmail(normalized)) {
    return true;
  }

  if (!deviceToken) return false;

  const supabase = getServiceSupabase();
  if (!supabase) {
    // Fail open only if DB unavailable so a missing migration doesn't brick sales.
    return true;
  }

  const { data, error } = await supabase
    .from('paid_device_access')
    .select('device_token')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    console.error('isActivePaidDevice error:', error.message);
    return true;
  }

  // No row yet (legacy cookie before this feature) — deny; they can restore.
  if (!data) return false;

  return data.device_token === deviceToken;
}

export async function getDeviceTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? null;
}
