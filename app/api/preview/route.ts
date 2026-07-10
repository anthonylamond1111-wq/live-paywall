import { NextResponse } from 'next/server';
import { PLAYER_STREAM_URL, PREVIEW_SECONDS } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({
    url: PLAYER_STREAM_URL,
    seconds: PREVIEW_SECONDS,
  });
}
