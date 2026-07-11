import { NextResponse } from 'next/server';
import {
  getServiceSupabase,
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';
import { chatDisplayName } from '@/lib/chat-display';
import { isChatAdmin } from '@/lib/chat-admin';
import { checkUserCanChat } from '@/lib/chat-moderation';

export const dynamic = 'force-dynamic';

const MESSAGE_LIMIT = 100;

async function requirePaidUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = getTokenFromRequest(request);
  const paid = await resolveUserAccess(user, token);
  if (!paid) {
    return { error: NextResponse.json({ error: 'Payment required' }, { status: 402 }) };
  }

  return { user };
}

export async function GET(request: Request) {
  const result = await requirePaidUser(request);
  if ('error' in result && result.error) return result.error;

  const { user } = result;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Chat not configured' }, { status: 503 });
  }

  const block = await checkUserCanChat(supabase, user.id);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, user_id, display_name, body, created_at')
    .order('created_at', { ascending: false })
    .limit(MESSAGE_LIMIT);

  if (error) {
    console.error('Chat load error:', error.message);
    return NextResponse.json({ error: 'Could not load chat' }, { status: 500 });
  }

  const messages = (data ?? []).slice().reverse();

  return NextResponse.json({
    messages,
    isAdmin: isChatAdmin(user.email),
    chatBlock: block.blocked ? block : null,
  });
}

export async function POST(request: Request) {
  const result = await requirePaidUser(request);
  if ('error' in result && result.error) return result.error;

  const { user } = result;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'Message must be 1–500 characters' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Chat not configured' }, { status: 503 });
  }

  const block = await checkUserCanChat(supabase, user.id);
  if (block.blocked) {
    return NextResponse.json({ error: block.message }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      display_name: chatDisplayName(user.email),
      body: text,
    })
    .select('id, user_id, display_name, body, created_at')
    .single();

  if (error) {
    console.error('Chat send error:', error.message);
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
