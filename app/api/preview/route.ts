import { NextResponse } from 'next/server';
import { PREVIEW_SECONDS, STREAM_URL } from '@/lib/constants';

export async function GET() {
  if (!STREAM_URL) {
    return NextResponse.json({ error: 'Stream not configured' }, { status: 500 });
  }

  return NextResponse.json({
    url: STREAM_URL,
    seconds: PREVIEW_SECONDS,
  });
}
