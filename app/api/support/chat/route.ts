import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SUPPORT_THREAD_COOKIE, supportThreadCookieOptions } from '@/lib/support-thread';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MESSAGE_LIMIT = 80;

function getOrCreateThreadId(existing?: string | null) {
  if (existing && existing.length >= 8) return existing;
  return crypto.randomUUID();
}

export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Support chat not configured' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const threadId = getOrCreateThreadId(cookieStore.get(SUPPORT_THREAD_COOKIE)?.value);

  const { data, error } = await supabase
    .from('support_messages')
    .select('id, role, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(MESSAGE_LIMIT);

  if (error) {
    console.error('Support chat load error:', error.message);
    return NextResponse.json({ error: 'Could not load support chat' }, { status: 500 });
  }

  const response = NextResponse.json({ messages: data ?? [], threadId });
  response.cookies.set(supportThreadCookieOptions(threadId));
  return response;
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Support chat not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    email?: string;
  };

  const message = body.message?.trim() ?? '';
  if (message.length < 1 || message.length > 1000) {
    return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const threadId = getOrCreateThreadId(cookieStore.get(SUPPORT_THREAD_COOKIE)?.value);
  const email = body.email?.trim().slice(0, 120) || null;

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      thread_id: threadId,
      role: 'visitor',
      body: message,
      email,
    })
    .select('id, role, body, created_at')
    .single();

  if (error) {
    console.error('Support chat send error:', error.message);
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 });
  }

  const response = NextResponse.json({ message: data });
  response.cookies.set(supportThreadCookieOptions(threadId));
  return response;
}
