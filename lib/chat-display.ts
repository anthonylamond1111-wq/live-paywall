import { isChatAdmin, OWNER_EMAIL } from '@/lib/chat-admin';

export const OWNER_DISPLAY_NAME =
  process.env.OWNER_CHAT_NAME ?? 'UFC Access (Owner)';

export function chatDisplayName(email?: string | null): string {
  if (email?.toLowerCase() === OWNER_EMAIL) {
    return OWNER_DISPLAY_NAME;
  }

  if (!email) return 'Viewer';
  const local = email.split('@')[0] ?? 'Viewer';
  return local.slice(0, 20);
}

export function isOwnerDisplayName(name: string): boolean {
  return name === OWNER_DISPLAY_NAME;
}
