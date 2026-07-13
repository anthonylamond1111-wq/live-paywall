import { hasFreeAccess } from '@/lib/free-access';

/** Account allowed on multiple devices at once */
export const MULTI_DEVICE_EMAIL = (
  process.env.NEXT_PUBLIC_MULTI_DEVICE_EMAIL ?? 'anthonylamond1111@gmail.com'
).toLowerCase();

export function isMultiDeviceEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  // Owner + free-access comps (e.g. Callan) — no single-device kick
  return normalized === MULTI_DEVICE_EMAIL || hasFreeAccess(normalized);
}

export function getSessionIdFromAccessToken(accessToken: string): string | null {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return null;

    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(normalized, 'base64').toString('utf8')
        : atob(normalized);

    const decoded = JSON.parse(json) as { session_id?: string };
    return decoded.session_id ?? null;
  } catch {
    return null;
  }
}
