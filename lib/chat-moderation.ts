import type { SupabaseClient } from '@supabase/supabase-js';

export type ModerationRecord = {
  user_id: string;
  banned: boolean;
  timeout_until: string | null;
  display_name: string | null;
  updated_at: string;
};

export type ChatBlockReason =
  | { blocked: false }
  | { blocked: true; reason: 'banned' | 'timeout'; until?: string; message: string };

export async function getUserModeration(
  supabase: SupabaseClient,
  userId: string
): Promise<ModerationRecord | null> {
  const { data } = await supabase
    .from('chat_moderation')
    .select('user_id, banned, timeout_until, display_name, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  return data;
}

export function getChatBlockReason(record: ModerationRecord | null): ChatBlockReason {
  if (!record) return { blocked: false };

  if (record.banned) {
    return {
      blocked: true,
      reason: 'banned',
      message: 'You have been banned from chat.',
    };
  }

  if (record.timeout_until) {
    const until = new Date(record.timeout_until);
    if (until.getTime() > Date.now()) {
      return {
        blocked: true,
        reason: 'timeout',
        until: record.timeout_until,
        message: `You are timed out until ${until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }
  }

  return { blocked: false };
}

export async function checkUserCanChat(
  supabase: SupabaseClient,
  userId: string
): Promise<ChatBlockReason> {
  const record = await getUserModeration(supabase, userId);
  return getChatBlockReason(record);
}
