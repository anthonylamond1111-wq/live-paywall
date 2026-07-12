import { NextResponse } from 'next/server';
import {
  SITE_LOCK_COOKIE,
  getSiteLockPassword,
  isSiteLockEnabled,
  siteLockCookieOptions,
} from '@/lib/site-lock';

export async function POST(request: Request) {
  if (!isSiteLockEnabled()) {
    return NextResponse.json({ ok: true, unlocked: true });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password?.trim() ?? '';

  if (!password || password !== getSiteLockPassword()) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_LOCK_COOKIE, '1', siteLockCookieOptions());
  return response;
}
