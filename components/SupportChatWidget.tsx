'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENT } from '@/lib/event';

type SupportMessage = {
  id: string;
  role: 'visitor' | 'staff';
  body: string;
  created_at: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/support/chat', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Support chat unavailable');
        return;
      }
      setMessages((data.messages ?? []) as SupportMessage[]);
      setError('');
    } catch {
      setError('Could not connect to support');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void loadMessages().finally(() => setLoading(false));
    const timer = window.setInterval(() => void loadMessages(), 5000);
    return () => window.clearInterval(timer);
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          email: email.trim() || undefined,
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
      setDraft('');
    } catch {
      setError('Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-[5.25rem] right-4 z-40 sm:bottom-6">
      {open && (
        <div className="pointer-events-auto mb-3 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-red-600/40 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-md sm:w-96">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-red-950/40 to-black px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Live support
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">Need help tonight?</p>
              <p className="mt-1 text-xs text-gray-500">Payment, stream, or login issues</p>
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
                Send a message and we&apos;ll reply here as fast as we can during the event.
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
                        isStaff
                          ? 'bg-zinc-800 text-gray-100'
                          : 'bg-red-600 text-white'
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
            {messages.length === 0 && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional, for follow-up)"
                className="mb-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                placeholder="Type your message…"
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
              >
                Send
              </button>
            </div>
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
        className="pointer-events-auto ml-auto flex items-center gap-2 rounded-full border border-red-600/50 bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.576 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {open ? 'Close support' : 'Live support'}
      </button>
    </div>
  );
}
