import { NextResponse } from 'next/server';
import { isChatAdmin } from '@/lib/chat-admin';
import { addStaffMessage, listRecentMessages } from '@/lib/support-store';
import { getTokenFromRequest, getUserFromRequest } from '@/lib/supabase/server';

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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const data = listRecentMessages(since);

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

  for (const row of data) {
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

  const payload = (await request.json().catch(() => ({}))) as {
    threadId?: string;
    message?: string;
  };

  const threadId = payload.threadId?.trim();
  const message = payload.message?.trim() ?? '';

  if (!threadId || message.length < 1 || message.length > 1000) {
    return NextResponse.json({ error: 'Invalid reply' }, { status: 400 });
  }

  const data = addStaffMessage({ threadId, body: message });
  return NextResponse.json({ message: data });
}
