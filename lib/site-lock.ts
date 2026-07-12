export const SITE_LOCK_COOKIE = 'ufc_site_unlock';

/** Emergency site lock — on until SITE_LOCK_ENABLED=false in Railway. */
export function isSiteLockEnabled(): boolean {
  return process.env.SITE_LOCK_ENABLED !== 'false';
}

/** Change via SITE_LOCK_PASSWORD in Railway. */
export function getSiteLockPassword(): string {
  return process.env.SITE_LOCK_PASSWORD ?? 'UFC-LOCK-2026';
}

export function siteLockCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  };
}
