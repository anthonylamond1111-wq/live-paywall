'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isChatAdmin } from '@/lib/chat-admin';
import {
  OWNER_DISPLAY_NAME,
  chatDisplayName,
  isOwnerDisplayName,
} from '@/lib/chat-display';
import {
  chatUsernameError,
  getStoredChatUsername,
  storeChatUsername,
} from '@/lib/chat-username';
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
  mobileExpanded?: boolean;
};

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_LIMIT = 100;
const SLOW_MODE_MS = 2000;
const QUICK_REACTIONS = ['🔥', '🥊', '😮', '👏', '💪'];
const TIMEOUT_OPTIONS = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isReactionOnly(body: string) {
  return QUICK_REACTIONS.includes(body.trim());
}

function ChatName({ name, isOwn }: { name: string; isOwn: boolean }) {
  const owner = isOwnerDisplayName(name);

  return (
    <span className={`inline-flex items-center gap-1 ${isOwn && !owner ? 'text-red-300' : ''}`}>
      {owner && <span className="chat-owner-glove text-sm leading-none">🥊</span>}
      <span className={owner ? 'chat-owner-name normal-case tracking-normal' : ''}>{name}</span>
    </span>
  );
}

async function chatFetch(session: Session, path: string, init?: RequestInit) {
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
}

export default function LiveChat({
  session,
  viewerCount,
  streamLive = true,
  beforeStreamStart = false,
  mobileExpanded = false,
}: LiveChatProps) {
  const isOwner = isChatAdmin(session.user.email);
  const ownerChatName = chatDisplayName(session.user.email);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [isAdmin, setIsAdmin] = useState(isOwner);
  const [chatBlocked, setChatBlocked] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<string | null>(null);
  const [chatUsername, setChatUsername] = useState<string | null>(isOwner ? ownerChatName : null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    if (isOwner) {
      setChatUsername(ownerChatName);
      return;
    }
    setChatUsername(getStoredChatUsername());
  }, [isOwner, ownerChatName]);

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

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const replaceMessage = useCallback((tempId: string, message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev.filter((item) => item.id !== tempId);
      }
      return prev.map((item) => (item.id === tempId ? message : item));
    });
  }, []);

  const sendMessage = (body: string) => {
    if (chatBlocked || !chatUsername) return;

    const trimmed = body.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastSentAt < SLOW_MODE_MS) {
      setError('Slow mode — wait a moment between messages.');
      return;
    }

    const displayName = isOwner ? ownerChatName : chatUsername;
    const tempId = `pending-${crypto.randomUUID()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      user_id: session.user.id,
      display_name: displayName,
      body: trimmed.slice(0, MAX_MESSAGE_LENGTH),
      created_at: new Date().toISOString(),
    };

    appendMessage(optimistic);
    setDraft('');
    setLastSentAt(now);
    setError('');

    void chatFetch(session, '/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        body: optimistic.body,
        displayName: isOwner ? undefined : chatUsername,
      }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          removeMessage(tempId);
          setDraft(trimmed);
          setError(data.error ?? 'Could not send message.');
          if (res.status === 403) {
            setChatBlocked(data.error ?? 'You cannot chat right now.');
          }
          return;
        }

        if (data.message) {
          replaceMessage(tempId, data.message as ChatMessage);
        }
      })
      .catch(() => {
        removeMessage(tempId);
        setDraft(trimmed);
        setError('Could not send message. Check your connection.');
      });
  };

  const moderateUser = async (
    action: 'ban' | 'unban' | 'timeout',
    message: ChatMessage,
    minutes?: number
  ) => {
    const key = `${action}-${message.user_id}`;
    setModBusy(key);
    setError('');

    try {
      const res = await chatFetch(session, '/api/chat/moderate', {
        method: 'POST',
        body: JSON.stringify({
          action,
          userId: message.user_id,
          displayName: message.display_name,
          minutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Moderation failed.');
        return;
      }

      if (action === 'ban') {
        setError(`${message.display_name} has been banned from chat.`);
      } else if (action === 'timeout') {
        setError(`${message.display_name} timed out for ${minutes} minutes.`);
      } else {
        setError(`${message.display_name} can chat again.`);
      }
    } catch {
      setError('Moderation request failed.');
    } finally {
      setModBusy(null);
    }
  };

  useEffect(() => {
    let active = true;
    setIsAdmin(isOwner);

    const loadMessages = async () => {
      try {
        const res = await chatFetch(session, '/api/chat?live=1');
        const data = await res.json();

        if (!active) return;

        if (!res.ok) {
          setError(data.error ?? 'Chat could not load.');
          setReady(true);
          return;
        }

        setMessages(data.messages ?? []);
        setIsAdmin(data.isAdmin ?? isOwner);
        if (data.chatBlock?.message) {
          setChatBlocked(data.chatBlock.message);
        }
        setReady(true);
      } catch {
        if (active) {
          setError('Chat could not load. Check your connection.');
          setReady(true);
        }
      }
    };

    void loadMessages();

    const supabase = getSupabaseClient();
    if (!supabase) return () => { active = false; };

    const channel = supabase
      .channel(`live-chat-${session.user.id}`)
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
  }, [appendMessage, isOwner, session]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(draft);
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = chatUsernameError(usernameDraft);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    const saved = storeChatUsername(usernameDraft);
    if (!saved) {
      setUsernameError('Could not save username. Try another one.');
      return;
    }

    setChatUsername(saved);
    setUsernameDraft('');
    setUsernameError('');
  };

  const uniqueChatters = new Set(messages.map((m) => m.user_id)).size;
  const canSend = !chatBlocked && !!chatUsername;
  const needsUsername = !chatBlocked && !chatUsername && !isOwner;

  return (
    <div
      id="live-chat-panel"
      className={`flex flex-col overflow-hidden rounded-2xl border border-red-600/50 bg-zinc-900/90 shadow-lg shadow-red-900/5 sm:rounded-3xl ${
        mobileExpanded
          ? 'h-[min(55dvh,420px)] min-h-[280px]'
          : 'h-72 min-h-[240px] sm:h-80'
      }`}
    >
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Live Chat
            </h3>
            {isAdmin && (
              <span className="rounded bg-red-600/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                Admin
              </span>
            )}
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
        {isAdmin && (
          <p className="mt-1 text-[10px] text-red-400/80">
            Admin: use timeout or ban on any message below
          </p>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!ready && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        )}

        {ready && messages.length === 0 && !error && !chatBlocked && (
          <p className="text-center text-sm text-gray-500">
            No messages yet. Say something to kick off the chat.
          </p>
        )}

        {messages.map((message) => {
          const isOwn = message.user_id === session.user.id;
          const reactionOnly = isReactionOnly(message.body);
          const showMod = isAdmin && !isOwn;

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
                    <ChatName name={message.display_name} isOwn={isOwn} />
                    <span>{formatTime(message.created_at)}</span>
                  </div>
                )}
                <p className={reactionOnly ? '' : 'break-words text-sm leading-relaxed'}>
                  {message.body}
                </p>
              </div>

              {showMod && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {TIMEOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={!!modBusy}
                      onClick={() => void moderateUser('timeout', message, opt.minutes)}
                      className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-gray-400 transition hover:border-amber-500 hover:text-amber-400 disabled:opacity-50"
                    >
                      {modBusy === `timeout-${message.user_id}` ? '…' : opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={!!modBusy}
                    onClick={() => void moderateUser('ban', message)}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-gray-400 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {modBusy === `ban-${message.user_id}` ? '…' : 'Ban'}
                  </button>
                  <button
                    type="button"
                    disabled={!!modBusy}
                    onClick={() => void moderateUser('unban', message)}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-gray-400 transition hover:border-green-500 hover:text-green-400 disabled:opacity-50"
                  >
                    Unban
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900/80 p-3">
        {chatBlocked && (
          <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {chatBlocked}
          </p>
        )}

        {error && !chatBlocked && (
          <p className="mb-2 text-xs text-red-400">{error}</p>
        )}

        {needsUsername && (
          <form
            onSubmit={handleUsernameSubmit}
            className="rounded-xl border border-zinc-700 bg-black/40 p-4"
          >
            <p className="text-sm font-semibold text-white">Choose your chat name</p>
            <p className="mt-1 text-xs text-gray-500">
              Pick a username before you join the room. Letters, numbers, _ and - only.
            </p>
            {usernameError && (
              <p className="mt-3 text-xs text-red-400">{usernameError}</p>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={usernameDraft}
                onChange={(e) => {
                  setUsernameDraft(e.target.value);
                  setUsernameError('');
                }}
                maxLength={20}
                placeholder="Your username"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!usernameDraft.trim()}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
              >
                Join chat
              </button>
            </div>
          </form>
        )}

        {!chatBlocked && chatUsername && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs text-gray-500">
                Chatting as{' '}
                {isOwner ? (
                  <ChatName name={chatUsername} isOwn={false} />
                ) : (
                  <span className="font-semibold text-gray-300">{chatUsername}</span>
                )}
              </p>
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setChatUsername(null);
                    setUsernameDraft('');
                  }}
                  className="text-[10px] text-gray-600 underline transition hover:text-gray-400"
                >
                  Change name
                </button>
              )}
            </div>

            <form onSubmit={handleSend}>
              <div className="mb-2 flex gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={!canSend}
                    onClick={() => sendMessage(emoji)}
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
                  disabled={!canSend}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!canSend || !draft.trim()}
                  className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
