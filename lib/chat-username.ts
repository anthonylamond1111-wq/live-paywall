const STORAGE_KEY = 'ufc_chat_username';
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

const RESERVED = new Set([
  'admin',
  'owner',
  'moderator',
  'mod',
  'ufc',
  'ufcaccess',
  'system',
  'support',
  'staff',
]);

export function getStoredChatUsername(): string | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(STORAGE_KEY)?.trim();
  if (!value) return null;
  return sanitizeChatUsername(value);
}

export function storeChatUsername(username: string): string | null {
  const sanitized = sanitizeChatUsername(username);
  if (!sanitized || typeof window === 'undefined') return null;
  localStorage.setItem(STORAGE_KEY, sanitized);
  return sanitized;
}

export function sanitizeChatUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return null;
  if (!USERNAME_PATTERN.test(trimmed)) return null;
  if (RESERVED.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function chatUsernameError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_LENGTH) return `Username must be at least ${MIN_LENGTH} characters.`;
  if (trimmed.length > MAX_LENGTH) return `Username must be ${MAX_LENGTH} characters or less.`;
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Use letters, numbers, underscores, or hyphens only.';
  }
  if (RESERVED.has(trimmed.toLowerCase())) return 'That username is reserved.';
  return null;
}
