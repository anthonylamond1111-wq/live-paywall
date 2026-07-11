import { NextResponse } from 'next/server';
import {
  getSessionIdFromAccessToken,
  isMultiDeviceEmail,
} from '@/lib/single-device-auth';
import {
  getTokenFromRequest,
  getUserFromRequest,
  registerActiveAuthSession,
  signOutOtherAuthSessions,
} from '@/lib/supabase/server';

export async function POST(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserFromRequest(request, { skipSessionCheck: true });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = getSessionIdFromAccessToken(token);
  if (!sessionId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  if (isMultiDeviceEmail(user.email)) {
    return NextResponse.json({ ok: true, exempt: true });
  }

  const saved = await registerActiveAuthSession(user.id, sessionId);
  if (!saved) {
    return NextResponse.json({ error: 'Could not register session' }, { status: 500 });
  }

  await signOutOtherAuthSessions(token);

  return NextResponse.json({ ok: true });
}
