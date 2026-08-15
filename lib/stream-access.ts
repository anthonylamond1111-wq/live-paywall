/** Purchases and Stripe sessions before this do not unlock the current stream. */
const DEFAULT_STREAM_ACCESS_STARTED_AT = '2026-08-15T17:00:00.000Z';

export function getStreamAccessStartedAt(): Date {
  const raw = process.env.STREAM_ACCESS_STARTED_AT ?? DEFAULT_STREAM_ACCESS_STARTED_AT;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date(DEFAULT_STREAM_ACCESS_STARTED_AT)
    : parsed;
}

export function getStreamAccessStartedAtIso(): string {
  return getStreamAccessStartedAt().toISOString();
}

export function getStreamAccessStartedAtUnix(): number {
  return Math.floor(getStreamAccessStartedAt().getTime() / 1000);
}

export function isCurrentStreamPayment(createdUnix?: number | null): boolean {
  if (createdUnix == null) return false;
  return createdUnix >= getStreamAccessStartedAtUnix();
}
