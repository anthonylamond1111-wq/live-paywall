'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { EVENT } from '@/lib/event';

type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

type LiveChatProps = {
  session: Session;
  viewerCount?: number;
  streamLive?: boolean;
  beforeStreamStart?: boolean;
};

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_LIMIT = 100;
const SLOW_MODE_MS = 2000;
const QUICK_REACTIONS = ['🔥', '🥊', '😮', '👏', '💪'];

function displayNameFromEmail(email?: string | null) {
  if (!email) return 'Viewer';
  const local = email.split('@')[0] ?? 'Viewer';
  return local.slice(0, 20);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isReactionOnly(body: string) {
  return QUICK_REACTIONS.includes(body.trim());
}

export default function LiveChat({
  session,
  viewerCount,
  streamLive = true,
  beforeStreamStart = false,
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      const next = [...prev, message];
      if (next.length > MESSAGE_LIMIT) {
        return next.slice(next.length - MESSAGE_LIMIT);
      }
      return next;
    });
  }, []);

  const sendMessage = async (body: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const trimmed = body.trim();
    if (!trimmed || sending) return;

    const now = Date.now();
    if (now - lastSentAt < SLOW_MODE_MS) {
      setError('Slow mode — wait a moment between messages.');
      return;
    }

    setSending(true);
    setError('');

    const { error: insertError } = await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      display_name: displayNameFromEmail(session.user.email),
      body: trimmed.slice(0, MAX_MESSAGE_LENGTH),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setDraft('');
      setLastSentAt(now);
    }

    setSending(false);
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;

    const loadMessages = async () => {
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, user_id, display_name, body, created_at')
        .order('created_at', { ascending: true })
        .limit(MESSAGE_LIMIT);

      if (!active) return;

      if (fetchError) {
        setError('Chat could not load. Make sure chat is set up in Supabase.');
        setReady(true);
        return;
      }

      setMessages(data ?? []);
      setReady(true);
    };

    void loadMessages();

    const channel = supabase
      .channel('live-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          appendMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [appendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(draft);
  };

  const uniqueChatters = new Set(messages.map((m) => m.user_id)).size;

  return (
    <div className="flex h-72 min-h-[240px] flex-col overflow-hidden rounded-2xl border border-red-600/50 bg-zinc-900/90 shadow-lg shadow-red-900/5 landscape:h-[min(70dvh,100%)] landscape:min-h-[200px] sm:h-80 lg:h-[min(70vh,520px)] lg:min-h-[400px]">
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Live Chat
            </h3>
          </div>
          {ready && !error && (
            <span className="text-[10px] text-gray-500">
              {uniqueChatters} in chat
              {viewerCount ? ` • ${viewerCount} watching` : ''}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {beforeStreamStart
            ? `Pre-event chat — stream live ${EVENT.streamStartLabel}`
            : streamLive
              ? 'Paid viewers only'
              : 'Pre-show chat — stream starting soon'}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!ready && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        )}

        {ready && messages.length === 0 && !error && (
          <p className="text-center text-sm text-gray-500">
            No messages yet. Say something to kick off the chat.
          </p>
        )}

        {messages.map((message) => {
          const isOwn = message.user_id === session.user.id;
          const reactionOnly = isReactionOnly(message.body);

          return (
            <div key={message.id} className={isOwn ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] text-left ${
                  reactionOnly
                    ? 'px-1 py-1 text-2xl'
                    : `rounded-2xl px-3 py-2 ${
                        isOwn
                          ? 'bg-red-600/25 text-white ring-1 ring-red-500/20'
                          : 'bg-zinc-800/90 text-gray-100'
                      }`
                }`}
              >
                {!reactionOnly && (
                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400">
                    <span className={isOwn ? 'text-red-300' : 'text-gray-300'}>
                      {message.display_name}
                    </span>
                    <span>{formatTime(message.created_at)}</span>
                  </div>
                )}
                <p className={reactionOnly ? '' : 'break-words text-sm leading-relaxed'}>
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-zinc-800 bg-zinc-900/80 p-3">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        <div className="mb-2 flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(emoji)}
              className="rounded-lg px-2 py-1 text-lg transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Message the room…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
