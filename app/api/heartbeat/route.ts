import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase/server';
import { ACTIVE_VISITOR_SECONDS, visitorCookieOptions, VISITOR_COOKIE } from '@/lib/visitor-session';

export const dynamic = 'force-dynamic';

type HeartbeatView = 'site' | 'stream';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  let body: { view?: HeartbeatView; path?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const view: HeartbeatView = body.view === 'stream' ? 'stream' : 'site';
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : '/';

  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
  }

  const { error } = await supabase.from('site_visitor_sessions').upsert(
    {
      visitor_id: visitorId,
      view,
      path,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'visitor_id' }
  );

  if (error) {
    console.error('Heartbeat error:', error.message);
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(visitorCookieOptions(visitorId));
  return response;
}

export async function GET() {
  return NextResponse.json({
    activeWindowSeconds: ACTIVE_VISITOR_SECONDS,
  });
}
