'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENT } from '@/lib/event';
import {
  ensureSupportNotifyPermission,
  showSupportNotification,
} from '@/lib/support-notify';

type SupportMessage = {
  id: string;
  role: 'visitor' | 'staff';
  body: string;
  created_at: string;
};

const LAST_SEEN_STAFF_KEY = 'ufc_support_last_staff_id';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  const isFirstMessage = messages.length === 0;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/support/chat', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Support chat unavailable');
        return;
      }

      const next = (data.messages ?? []) as SupportMessage[];
      setMessages(next);
      setError('');

      const lastStaff = [...next].reverse().find((row) => row.role === 'staff');
      const lastSeen =
        typeof window !== 'undefined'
          ? sessionStorage.getItem(LAST_SEEN_STAFF_KEY)
          : null;

      if (lastStaff && lastStaff.id !== lastSeen) {
        if (!openRef.current) {
          setUnread((count) => Math.max(count, 1));
          showSupportNotification({
            title: 'Support replied',
            body: lastStaff.body.slice(0, 120),
            tag: `support-staff-${lastStaff.id}`,
            onClick: () => setOpen(true),
          });
        } else {
          sessionStorage.setItem(LAST_SEEN_STAFF_KEY, lastStaff.id);
          setUnread(0);
        }
      }

      if (openRef.current && lastStaff) {
        sessionStorage.setItem(LAST_SEEN_STAFF_KEY, lastStaff.id);
        setUnread(0);
      }
    } catch {
      setError('Could not connect to support');
    }
  }, []);

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), open ? 4000 : 10000);
    return () => window.clearInterval(timer);
  }, [open, loadMessages]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void loadMessages().finally(() => setLoading(false));
    void ensureSupportNotifyPermission();
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const visitorName = name.trim();
    const message = (isFirstMessage ? problem : draft).trim();

    if (isFirstMessage) {
      if (!visitorName) {
        setError('Enter your name');
        return;
      }
      if (!message) {
        setError('Tell us what the problem is');
        return;
      }
    } else if (!message) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          name: visitorName || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Could not send message');
        return;
      }

      if (data.message) {
        setMessages((current) => [...current, data.message as SupportMessage]);
      } else {
        await loadMessages();
      }
      setProblem('');
      setDraft('');
    } catch {
      setError('Could not send message');
    } finally {
      setSending(false);
    }
  };

  const canSend = isFirstMessage
    ? Boolean(name.trim() && problem.trim())
    : Boolean(draft.trim());

  return (
    <div className="pointer-events-none fixed bottom-28 right-4 z-50">
      {open && (
        <div className="pointer-events-auto mb-3 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-red-600/40 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-md sm:w-96">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-red-950/40 to-black px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Live support
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">Need help tonight?</p>
              <p className="mt-1 text-xs font-medium text-green-400">
                We usually reply within a minute
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-lg text-gray-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Close support chat"
            >
              ×
            </button>
          </div>

          <div className="flex max-h-72 min-h-48 flex-col overflow-y-auto px-3 py-3">
            {loading && messages.length === 0 && (
              <p className="text-center text-sm text-gray-500">Connecting…</p>
            )}

            {!loading && messages.length === 0 && !error && (
              <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-3 text-sm text-gray-400">
                Enter your name and what&apos;s wrong — we reply here fast, usually within a minute.
              </div>
            )}

            <div className="space-y-2">
              {messages.map((message) => {
                const isStaff = message.role === 'staff';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        isStaff ? 'bg-zinc-800 text-gray-100' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isStaff && (
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                          Support
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isStaff ? 'text-gray-500' : 'text-red-100/80'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-zinc-800 bg-black/50 p-3">
            {isFirstMessage ? (
              <div className="space-y-2">
                <div>
                  <label htmlFor="support-name" className="mb-1 block text-xs font-medium text-gray-400">
                    Your name
                  </label>
                  <input
                    id="support-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Enter name"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="support-problem"
                    className="mb-1 block text-xs font-medium text-gray-400"
                  >
                    What&apos;s the problem?
                  </label>
                  <textarea
                    id="support-problem"
                    required
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="e.g. Can’t pay, stream not loading, restore access…"
                    className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !canSend}
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send to support'}
                </button>
                <p className="text-center text-[11px] font-medium text-green-400/90">
                  We reply within a minute
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1000}
                    placeholder="Type a follow-up…"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !canSend}
                    className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-500">
                  We usually reply within a minute
                </p>
              </div>
            )}
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <p className="mt-2 text-center text-[10px] text-gray-600">
              Or email{' '}
              <a href={`mailto:${EVENT.supportEmail}`} className="text-red-400 hover:underline">
                {EVENT.supportEmail}
              </a>
            </p>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto relative ml-auto flex items-center gap-2 rounded-full border border-red-600/50 bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
      >
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-red-600">
            {unread}
          </span>
        )}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.576 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {open ? 'Close support' : unread > 0 ? 'Support replied' : 'Live support'}
      </button>
    </div>
  );
}
