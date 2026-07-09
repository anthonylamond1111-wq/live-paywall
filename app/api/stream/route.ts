import { NextResponse } from 'next/server';
import { hasPaidAccess } from '@/lib/access-cookie';
import { STREAM_URL } from '@/lib/constants';

export async function GET() {
  const paid = await hasPaidAccess();
  if (!paid) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  return NextResponse.json({ url: STREAM_URL });
}
