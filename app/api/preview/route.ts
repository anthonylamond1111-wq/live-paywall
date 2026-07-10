import { NextResponse } from 'next/server';
import { getStreamUrl, PREVIEW_SECONDS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const streamUrl = getStreamUrl();
  if (!streamUrl) {
    return NextResponse.json({ error: 'Stream not configured' }, { status: 500 });
  }

  return NextResponse.json({
    url: streamUrl,
    seconds: PREVIEW_SECONDS,
  });
}
