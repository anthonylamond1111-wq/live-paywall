import { isChatAdmin, OWNER_EMAIL } from '@/lib/chat-admin';

export { OWNER_EMAIL };

export function isSiteAdmin(email?: string | null): boolean {
  return isChatAdmin(email);
}
