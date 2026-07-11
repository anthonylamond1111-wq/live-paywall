import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isMultiDeviceEmail } from '@/lib/single-device-auth';

export const SINGLE_DEVICE_SIGNOUT_MESSAGE =
  'This account was signed in on another device. Only one device can be active at a time.';

export async function claimActiveSession(
  supabase: SupabaseClient,
  session: Session
): Promise<void> {
  if (isMultiDeviceEmail(session.user.email)) return;

  await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  await supabase.auth.signOut({ scope: 'others' });
}
