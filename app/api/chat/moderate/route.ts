import { NextResponse } from 'next/server';
import { isChatAdmin } from '@/lib/chat-admin';
import {
  getServiceSupabase,
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ModerateAction = 'ban' | 'unban' | 'timeout';

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isChatAdmin(user.email)) {
    return { error: NextResponse.json({ error: 'Admin only' }, { status: 403 }) };
  }

  const token = getTokenFromRequest(request);
  const paid = await resolveUserAccess(user, token);
  if (!paid) {
    return { error: NextResponse.json({ error: 'Payment required' }, { status: 402 }) };
  }

  return { user };
}

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result && result.error) return result.error;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Moderation not configured' }, { status: 503 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('chat_moderation')
    .select('user_id, banned, timeout_until, display_name, updated_at')
    .or(`banned.eq.true,timeout_until.gt.${now}`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Moderation list error:', error.message);
    return NextResponse.json({ error: 'Could not load moderation list' }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result && result.error) return result.error;

  const { user: admin } = result;
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    action?: ModerateAction;
    userId?: string;
    displayName?: string;
    minutes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { action, userId, displayName, minutes } = body;

  if (!action || !userId) {
    return NextResponse.json({ error: 'action and userId required' }, { status: 400 });
  }

  if (userId === admin.id) {
    return NextResponse.json({ error: 'You cannot moderate yourself' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Moderation not configured' }, { status: 503 });
  }

  const now = new Date().toISOString();

  if (action === 'ban') {
    const { error } = await supabase.from('chat_moderation').upsert(
      {
        user_id: userId,
        banned: true,
        timeout_until: null,
        display_name: displayName ?? null,
        updated_at: now,
        updated_by: admin.id,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Ban error:', error.message);
      return NextResponse.json({ error: 'Could not ban user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: 'ban' });
  }

  if (action === 'unban') {
    const { error } = await supabase.from('chat_moderation').upsert(
      {
        user_id: userId,
        banned: false,
        timeout_until: null,
        display_name: displayName ?? null,
        updated_at: now,
        updated_by: admin.id,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Unban error:', error.message);
      return NextResponse.json({ error: 'Could not unban user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: 'unban' });
  }

  if (action === 'timeout') {
    const duration = Math.min(Math.max(minutes ?? 5, 1), 24 * 60);
    const timeoutUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();

    const { error } = await supabase.from('chat_moderation').upsert(
      {
        user_id: userId,
        banned: false,
        timeout_until: timeoutUntil,
        display_name: displayName ?? null,
        updated_at: now,
        updated_by: admin.id,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Timeout error:', error.message);
      return NextResponse.json({ error: 'Could not timeout user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: 'timeout', timeoutUntil });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
