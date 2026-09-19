import { NextResponse } from 'next/server';
import { isChatAdmin } from '@/lib/chat-admin';
import {
  addStaffMessage,
  countWaitingThreads,
  listAllThreads,
} from '@/lib/support-store';
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

  const url = new URL(request.url);
  const summaryOnly = url.searchParams.get('summary') === '1';

  if (summaryOnly) {
    const waiting = await countWaitingThreads();
    return NextResponse.json({ waiting });
  }

  const list = await listAllThreads();
  return NextResponse.json({ threads: list });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if ('error' in auth && auth.error) return auth.error;

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      threadId?: string;
      message?: string;
    };

    const threadId = payload.threadId?.trim();
    const message = payload.message?.trim() ?? '';

    if (!threadId || message.length < 1 || message.length > 1000) {
      return NextResponse.json({ error: 'Invalid reply' }, { status: 400 });
    }

    const data = await addStaffMessage({ threadId, body: message });
    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Support admin POST error:', error);
    return NextResponse.json({ error: 'Could not send reply' }, { status: 500 });
  }
}
