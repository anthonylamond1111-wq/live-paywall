const OWNER_EMAIL =
  process.env.OWNER_EMAIL?.toLowerCase() ?? 'anthonylamond1111@gmail.com';

const OWNER_DISPLAY_NAME = process.env.OWNER_CHAT_NAME ?? 'owner';

export function chatDisplayName(email?: string | null): string {
  if (email?.toLowerCase() === OWNER_EMAIL) {
    return OWNER_DISPLAY_NAME;
  }

  if (!email) return 'Viewer';
  const local = email.split('@')[0] ?? 'Viewer';
  return local.slice(0, 20);
}
