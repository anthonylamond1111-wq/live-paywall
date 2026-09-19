'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ensureSupportNotifyPermission,
  showSupportNotification,
} from '@/lib/support-notify';

type SupportThread = {
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
};

async function adminFetch(session: Session, init?: RequestInit) {
  return fetch('/api/support/chat/admin', {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
}

export default function AdminSupportInbox({ session }: { session: Session }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const knownVisitorMsgRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  const loadInbox = useCallback(async () => {
    const res = await adminFetch(session);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Could not load support inbox');
      return;
    }

    const next = (data.threads ?? []) as SupportThread[];
    setThreads(next);
    setError('');

    const visitorIds = new Set<string>();
    for (const thread of next) {
      for (const message of thread.messages) {
        if (message.role === 'visitor') visitorIds.add(message.id);
      }
    }

    if (!primedRef.current) {
      knownVisitorMsgRef.current = visitorIds;
      primedRef.current = true;
      return;
    }

    for (const id of visitorIds) {
      if (knownVisitorMsgRef.current.has(id)) continue;
      const thread = next.find((row) => row.messages.some((msg) => msg.id === id));
      const message = thread?.messages.find((msg) => msg.id === id);
      if (message) {
        showSupportNotification({
          title: 'New support message',
          body: `${thread?.email ?? 'Visitor'}: ${message.body.slice(0, 100)}`,
          tag: `support-visitor-${id}`,
        });
      }
    }
    knownVisitorMsgRef.current = visitorIds;
  }, [session]);

  useEffect(() => {
    void ensureSupportNotifyPermission();
    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 5000);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  const selected = threads.find((thread) => thread.threadId === selectedId) ?? null;
  const waiting = threads.filter((thread) => thread.needsReply).length;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !reply.trim() || busy) return;

    setBusy(true);
    setError('');

    try {
      const res = await adminFetch(session, {
        method: 'POST',
        body: JSON.stringify({ threadId: selectedId, message: reply.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not send reply');
        return;
      }
      setReply('');
      await loadInbox();
    } catch {
      setError('Could not send reply');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm text-gray-300">
          {waiting > 0
            ? `${waiting} conversation${waiting === 1 ? '' : 's'} waiting for a reply`
            : 'No visitors waiting right now'}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          All messages are saved permanently. Refreshes every 5 seconds.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2">
          {threads.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-500">No support messages yet</p>
          )}
          {threads.map((thread) => {
            const last = thread.messages[thread.messages.length - 1];
            return (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => setSelectedId(thread.threadId)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedId === thread.threadId
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-zinc-800 bg-black/30 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {thread.email ?? `Visitor ${thread.threadId.slice(0, 8)}`}
                  </p>
                  {thread.needsReply && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      New
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{last?.body}</p>
                <p className="mt-1 text-[10px] text-gray-600">
                  {new Date(thread.lastAt).toLocaleString('en-GB')}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-[28rem] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
              Select a conversation to reply
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-800 px-4 py-3">
                <p className="font-medium text-white">
                  {selected.email ?? `Visitor ${selected.threadId.slice(0, 8)}`}
                </p>
                <p className="text-xs text-gray-600">{selected.messages.length} messages saved</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      message.role === 'staff'
                        ? 'ml-8 bg-zinc-800 text-gray-100'
                        : 'mr-8 bg-red-600/90 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(message.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="border-t border-zinc-800 p-3">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply to visitor…"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
