import { getServiceSupabase } from '@/lib/supabase/server';

export type SupportMessageRow = {
  id: string;
  thread_id: string;
  role: 'visitor' | 'staff';
  body: string;
  email: string | null;
  created_at: string;
};

export type SupportThreadSummary = {
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
  unreadVisitorCount: number;
};

/** In-memory fallback only when Supabase is unavailable (dev / before migration). */
const memoryMessages: SupportMessageRow[] = [];

function newId() {
  return crypto.randomUUID();
}

function mapRow(row: SupportMessageRow) {
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    created_at: row.created_at,
  };
}

function buildThreads(rows: SupportMessageRow[]): SupportThreadSummary[] {
  const threads = new Map<string, SupportThreadSummary>();

  for (const row of rows) {
    const entry = mapRow(row);
    const existing = threads.get(row.thread_id);

    if (!existing) {
      threads.set(row.thread_id, {
        threadId: row.thread_id,
        email: row.email ?? null,
        messages: [entry],
        lastAt: row.created_at,
        needsReply: row.role === 'visitor',
        unreadVisitorCount: row.role === 'visitor' ? 1 : 0,
      });
      continue;
    }

    if (row.email && !existing.email) existing.email = row.email;
    existing.messages.push(entry);
    existing.lastAt = row.created_at;
    existing.needsReply = row.role === 'visitor';
    if (row.role === 'visitor') {
      existing.unreadVisitorCount += 1;
    } else {
      existing.unreadVisitorCount = 0;
    }
  }

  return [...threads.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}

export async function listThreadMessages(threadId: string, limit = 120) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return memoryMessages
      .filter((row) => row.thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-limit)
      .map(mapRow);
  }

  const { data, error } = await supabase
    .from('support_messages')
    .select('id, thread_id, role, body, email, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('listThreadMessages error:', error.message);
    return [];
  }

  return (data as SupportMessageRow[]).map(mapRow);
}

export async function listAllThreads(limitMessages = 5000): Promise<SupportThreadSummary[]> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return buildThreads([...memoryMessages]);
  }

  const { data, error } = await supabase
    .from('support_messages')
    .select('id, thread_id, role, body, email, created_at')
    .order('created_at', { ascending: true })
    .limit(limitMessages);

  if (error) {
    console.error('listAllThreads error:', error.message);
    return [];
  }

  return buildThreads((data ?? []) as SupportMessageRow[]);
}

export async function countWaitingThreads(): Promise<number> {
  const threads = await listAllThreads();
  return threads.filter((thread) => thread.needsReply).length;
}

export async function addVisitorMessage(input: {
  threadId: string;
  body: string;
  email: string | null;
}) {
  const row: SupportMessageRow = {
    id: newId(),
    thread_id: input.threadId,
    role: 'visitor',
    body: input.body,
    email: input.email,
    created_at: new Date().toISOString(),
  };

  const supabase = getServiceSupabase();
  if (!supabase) {
    memoryMessages.push(row);
    return mapRow(row);
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      id: row.id,
      thread_id: row.thread_id,
      role: row.role,
      body: row.body,
      email: row.email,
      created_at: row.created_at,
    })
    .select('id, role, body, created_at')
    .single();

  if (error) {
    console.error('addVisitorMessage error:', error.message);
    throw new Error('Could not save support message');
  }

  return data as { id: string; role: 'visitor'; body: string; created_at: string };
}

export async function addStaffMessage(input: { threadId: string; body: string }) {
  const row: SupportMessageRow = {
    id: newId(),
    thread_id: input.threadId,
    role: 'staff',
    body: input.body,
    email: null,
    created_at: new Date().toISOString(),
  };

  const supabase = getServiceSupabase();
  if (!supabase) {
    memoryMessages.push(row);
    return mapRow(row);
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      id: row.id,
      thread_id: row.thread_id,
      role: row.role,
      body: row.body,
      email: null,
      created_at: row.created_at,
    })
    .select('id, role, body, created_at')
    .single();

  if (error) {
    console.error('addStaffMessage error:', error.message);
    throw new Error('Could not save support reply');
  }

  return data as { id: string; role: 'staff'; body: string; created_at: string };
}
