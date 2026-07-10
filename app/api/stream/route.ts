import { NextResponse } from 'next/server';
import { getStreamUrl } from '@/lib/constants';

export const dynamic = 'force-dynamic';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const streamUrl = getStreamUrl();
  if (!streamUrl) {
    return NextResponse.json({ error: 'Stream not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  const paid = await resolveUserAccess(user, token);
  if (!paid) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  return NextResponse.json({ url: streamUrl });
}
