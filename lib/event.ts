import { SITE_NAME } from '@/lib/brand';

export type FighterStats = {
  name: string;
  nickname: string;
  record: string;
  height: string;
  reach: string;
  stance: string;
  country: string;
};

export type FightBout = {
  fighters: string;
  weight: string;
  main?: boolean;
};

export type FAQItem = {
  q: string;
  a: string;
};

/** Stream go-live — Saturday 10:30 PM UK (BST = UTC+1). */
const DEFAULT_EVENT_START = '2026-09-19T21:30:00.000Z';
const configuredEventStart =
  process.env.NEXT_PUBLIC_EVENT_START_ISO ?? DEFAULT_EVENT_START;

function resolveStreamStart(iso: string) {
  // Ignore stale Railway/env times from earlier events.
  if (
    iso.includes('2026-08-15') ||
    iso.includes('2026-09-12') ||
    iso.includes('2026-09-13') ||
    iso.includes('2026-09-20T01:00')
  ) {
    return DEFAULT_EVENT_START;
  }
  return iso;
}

export const EVENT = {
  number: 'Tsarukyan vs Ruffy',
  tagline: 'UFC 331 · LIGHTWEIGHT',
  fighter1: 'TSARUKYAN',
  fighter2: 'RUFFY',
  venue: 'Crypto.com Arena, Los Angeles',
  streamStart: resolveStreamStart(configuredEventStart),
  streamStartLabel: 'Saturday 10:30 PM (UK)',
  replayMessage:
    'Your access includes the full live event. Replay available for 24 hours after the broadcast ends.',
  liveUpdateMessage: process.env.NEXT_PUBLIC_LIVE_UPDATE_MESSAGE ?? '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@ufcaccess.co.uk',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk',
  priceLabel: process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live',
  fighter1Stats: {
    name: 'Arman Tsarukyan',
    nickname: 'Ahalkalakets',
    record: '23–3',
    height: `5'7"`,
    reach: '72"',
    stance: 'Orthodox',
    country: 'Armenia',
  } satisfies FighterStats,
  fighter2Stats: {
    name: 'Mauricio Ruffy',
    nickname: 'The Assassin',
    record: '14–2',
    height: `5'11"`,
    reach: '74"',
    stance: 'Orthodox',
    country: 'Brazil',
  } satisfies FighterStats,
  fightCard: [
    {
      fighters: 'Arman Tsarukyan vs Mauricio Ruffy',
      weight: 'Lightweight',
      main: true,
    },
    {
      fighters: 'Joshua Van vs Alexandre Pantoja',
      weight: 'Flyweight Title',
    },
    {
      fighters: 'Patricio Freire vs Doo Ho Choi',
      weight: 'Featherweight',
    },
    {
      fighters: 'Gable Steveson vs Sean Sharaf',
      weight: 'Heavyweight',
    },
  ] satisfies FightBout[],
  perks: [
    'Full HD live stream',
    'Live chat with paid viewers',
    'Watch on phone, tablet & desktop',
    'Access saved on this device',
  ],
  faq: [
    {
      q: 'Is this the official broadcast?',
      a: `No — ${SITE_NAME} is an independent private live stream. We are not affiliated with UFC or any official broadcast partner. You get our HD feed and live chat for a one-time fee.`,
    },
    {
      q: 'Will it work on my phone or TV?',
      a: 'Yes — watch on any modern phone, tablet, or computer. For TV, use AirPlay (iPhone), Chromecast (Android Chrome), or connect your laptop via HDMI.',
    },
    {
      q: 'What if the stream drops?',
      a: 'Use Reconnect on the player if needed. Your paid access stays on this device — restore on a new device with your receipt email.',
    },
    {
      q: 'Can I get a refund?',
      a: 'If the stream is unavailable for a significant portion of the event due to a fault on our side, contact support within 24 hours for a refund review.',
    },
    {
      q: 'Do I need an account?',
      a: 'No account needed. Pay once and this device keeps access. Restore anytime with the same email from your Stripe receipt.',
    },
    {
      q: 'When does the stream start?',
      a: 'The broadcast goes live at Saturday 10:30 PM (UK). Join early — the player connects when we go live.',
    },
  ] satisfies FAQItem[],
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

export function hasStreamStarted(): boolean {
  return !getEventCountdown().isBeforeEvent;
}

export function getLiveUpdateMessage(): string {
  return EVENT.liveUpdateMessage.trim();
}
