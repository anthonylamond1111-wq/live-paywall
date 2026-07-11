const DEFAULT_FREE_ACCESS_EMAILS = ['anthonylamond777@gmail.com'];

function parseFreeAccessEmails(): Set<string> {
  const fromEnv = process.env.FREE_ACCESS_EMAILS;
  const emails = fromEnv
    ? fromEnv.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_FREE_ACCESS_EMAILS;

  return new Set(emails);
}

const FREE_ACCESS_EMAILS = parseFreeAccessEmails();

export function hasFreeAccess(email?: string | null): boolean {
  if (!email) return false;
  return FREE_ACCESS_EMAILS.has(email.trim().toLowerCase());
}
