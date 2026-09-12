import { NextResponse } from 'next/server';
import { isChatAdmin } from '@/lib/chat-admin';
import {
  getServiceSupabase,
  getTokenFromRequest,
  getUserFromRequest,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireOwner(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !isChatAdmin(user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, token: getTokenFromRequest(request) };
}

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if ('error' in auth && auth.error) return auth.error;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Support chat not configured' }, { status: 503 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('support_messages')
    .select('id, thread_id, role, body, email, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    console.error('Support admin load error:', error.message);
    return NextResponse.json({ error: 'Could not load support inbox' }, { status: 500 });
  }

  const threads = new Map<
    string,
    {
      threadId: string;
      email: string | null;
      messages: Array<{
        id: string;
        role: string;
        body: string;
        created_at: string;
      }>;
      lastAt: string;
      needsReply: boolean;
    }
  >();

  for (const row of data ?? []) {
    const existing = threads.get(row.thread_id);
    const entry = {
      id: row.id,
      role: row.role,
      body: row.body,
      created_at: row.created_at,
    };

    if (!existing) {
      threads.set(row.thread_id, {
        threadId: row.thread_id,
        email: row.email ?? null,
        messages: [entry],
        lastAt: row.created_at,
        needsReply: row.role === 'visitor',
      });
      continue;
    }

    if (row.email && !existing.email) existing.email = row.email;
    existing.messages.push(entry);
    existing.lastAt = row.created_at;
    existing.needsReply = row.role === 'visitor';
  }

  const list = [...threads.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  return NextResponse.json({ threads: list });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if ('error' in auth && auth.error) return auth.error;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Support chat not configured' }, { status: 503 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    threadId?: string;
    message?: string;
  };

  const threadId = payload.threadId?.trim();
  const message = payload.message?.trim() ?? '';

  if (!threadId || message.length < 1 || message.length > 1000) {
    return NextResponse.json({ error: 'Invalid reply' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      thread_id: threadId,
      role: 'staff',
      body: message,
    })
    .select('id, role, body, created_at')
    .single();

  if (error) {
    console.error('Support admin reply error:', error.message);
    return NextResponse.json({ error: 'Could not send reply' }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
