export type SupportMessageRow = {
  id: string;
  thread_id: string;
  role: 'visitor' | 'staff';
  body: string;
  email: string | null;
  created_at: string;
};

const messages: SupportMessageRow[] = [];
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 2000;

function prune() {
  const cutoff = Date.now() - MAX_AGE_MS;
  while (messages.length > MAX_MESSAGES) messages.shift();
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (new Date(messages[i].created_at).getTime() < cutoff) {
      messages.splice(i, 1);
    }
  }
}

function newId() {
  return crypto.randomUUID();
}

export function listThreadMessages(threadId: string, limit = 80) {
  prune();
  return messages
    .filter((row) => row.thread_id === threadId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-limit)
    .map(({ id, role, body, created_at }) => ({ id, role, body, created_at }));
}

export function listRecentMessages(sinceIso: string, limit = 500) {
  prune();
  return messages
    .filter((row) => row.created_at >= sinceIso)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-limit);
}

export function addVisitorMessage(input: {
  threadId: string;
  body: string;
  email: string | null;
}) {
  prune();
  const row: SupportMessageRow = {
    id: newId(),
    thread_id: input.threadId,
    role: 'visitor',
    body: input.body,
    email: input.email,
    created_at: new Date().toISOString(),
  };
  messages.push(row);
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    created_at: row.created_at,
  };
}

export function addStaffMessage(input: { threadId: string; body: string }) {
  prune();
  const row: SupportMessageRow = {
    id: newId(),
    thread_id: input.threadId,
    role: 'staff',
    body: input.body,
    email: null,
    created_at: new Date().toISOString(),
  };
  messages.push(row);
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    created_at: row.created_at,
  };
}
