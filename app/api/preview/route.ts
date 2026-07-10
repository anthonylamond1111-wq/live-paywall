import { NextResponse } from 'next/server';
import { PREVIEW_SECONDS, STREAM_URL } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({
    url: STREAM_URL,
    seconds: PREVIEW_SECONDS,
  });
}
