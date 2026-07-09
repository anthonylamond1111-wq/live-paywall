'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

type ChatMessage = {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

type LiveChatProps = {
  session: Session;
};

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_LIMIT = 100;

function displayNameFromEmail(email?: string | null) {
  if (!email) return 'Viewer';
  const local = email.split('@')[0] ?? 'Viewer';
  return local.slice(0, 20);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LiveChat({ session }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      const next = [...prev, message];
      if (next.length > MESSAGE_LIMIT) {
        return next.slice(next.length - MESSAGE_LIMIT);
      }
      return next;
    });
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
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');

    const { error: insertError } = await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      display_name: displayNameFromEmail(session.user.email),
      body: body.slice(0, MAX_MESSAGE_LENGTH),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setDraft('');
    }

    setSending(false);
  };

  return (
    <div className="flex h-72 min-h-[240px] flex-col overflow-hidden rounded-2xl border border-red-600/50 bg-zinc-900 landscape:h-[min(70dvh,100%)] landscape:min-h-[200px] sm:h-80 lg:h-[min(70vh,520px)] lg:min-h-[400px]">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Live Chat
          </h3>
        </div>
        <p className="mt-1 text-xs text-gray-500">Paid viewers only</p>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!ready && <p className="text-center text-sm text-gray-500">Loading chat…</p>}

        {ready && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No messages yet. Say something to kick off the chat.
          </p>
        )}

        {messages.map((message) => {
          const isOwn = message.user_id === session.user.id;

          return (
            <div key={message.id} className={isOwn ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-left ${
                  isOwn ? 'bg-red-600/20 text-white' : 'bg-zinc-800 text-gray-100'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400">
                  <span className={isOwn ? 'text-red-300' : 'text-gray-300'}>
                    {message.display_name}
                  </span>
                  <span>{formatTime(message.created_at)}</span>
                </div>
                <p className="break-words text-sm leading-relaxed">{message.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-zinc-800 p-3">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Message the room…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
