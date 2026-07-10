export type FightBout = {
  fighters: string;
  weight: string;
  main?: boolean;
};

export const EVENT = {
  number: 'UFC 329',
  tagline: 'THE NOTORIOUS RETURNS',
  fighter1: 'MCGREGOR',
  fighter2: 'HOLLOWAY',
  venue: 'T-Mobile Arena, Las Vegas',
  /** Stream start — Saturday 10 PM UK (BST). Override with NEXT_PUBLIC_EVENT_START_ISO on Railway */
  streamStart:
    process.env.NEXT_PUBLIC_EVENT_START_ISO ?? '2026-07-11T21:00:00.000Z',
  streamStartLabel: 'Saturday 10:00 PM (UK)',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@ufcaccess.co.uk',
  fightCard: [
    { fighters: 'Conor McGregor vs Max Holloway', weight: 'Lightweight', main: true },
    { fighters: 'Sean O\'Malley vs Song Yadong', weight: 'Bantamweight' },
    { fighters: 'Alex Pereira vs Khalil Rountree Jr.', weight: 'Light Heavyweight' },
    { fighters: 'Dustin Poirier vs Benoit Saint Denis', weight: 'Lightweight' },
  ] satisfies FightBout[],
  perks: [
    'Full HD live stream',
    'Live chat with paid viewers',
    'Watch on phone, tablet & desktop',
    'Access saved to your account',
  ],
} as const;

export function getEventCountdown() {
  const target = new Date(EVENT.streamStart).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const totalHours = Math.floor(diff / (1000 * 60 * 60));

  return {
    totalMs: diff,
    isBeforeEvent: diff > 0,
    totalHours,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}
