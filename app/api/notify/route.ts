import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 });
  }

  const { error } = await supabase.from('notify_signups').upsert(
    { email },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('Notify signup error:', error.message);
    return NextResponse.json({ error: 'Could not save notification' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
