import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SITE_LOCK_COOKIE, isSiteLockEnabled } from '@/lib/site-lock';

const PUBLIC_PATHS = [
  '/lock',
  '/api/unlock',
  '/api/webhooks/stripe',
];

export function middleware(request: NextRequest) {
  if (!isSiteLockEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sounds') ||
    pathname.startsWith('/fighters') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  const unlocked = request.cookies.get(SITE_LOCK_COOKIE)?.value === '1';
  if (unlocked) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Site is locked' }, { status: 401 });
  }

  const lockUrl = request.nextUrl.clone();
  lockUrl.pathname = '/lock';
  lockUrl.search = '';
  return NextResponse.redirect(lockUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
