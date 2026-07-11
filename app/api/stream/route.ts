import { NextResponse } from 'next/server';
import { getHlsPlaylistPath } from '@/lib/hls-access';
import { getStreamUrl } from '@/lib/constants';

export const dynamic = 'force-dynamic';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

function getRequestOrigin(request: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!getStreamUrl()) {
    return NextResponse.json({ error: 'Stream not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  const paid = await resolveUserAccess(user, token);
  if (!paid) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  const origin = getRequestOrigin(request);
  return NextResponse.json({ url: `${origin}${getHlsPlaylistPath()}` });
}
