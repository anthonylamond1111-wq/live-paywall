export const OWNER_EMAIL =
  process.env.OWNER_EMAIL?.toLowerCase() ?? 'anthonylamond1111@gmail.com';

export function isChatAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === OWNER_EMAIL;
}
