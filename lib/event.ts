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

const DEFAULT_EVENT_START = '2026-09-12T23:00:00.000Z';
const configuredEventStart =
  process.env.NEXT_PUBLIC_EVENT_START_ISO ?? DEFAULT_EVENT_START;

export const EVENT = {
  number: 'Garcia vs Benn',
  tagline: 'WBC WELTERWEIGHT TITLE',
  fighter1: 'GARCIA',
  fighter2: 'BENN',
  venue: 'T-Mobile Arena, Las Vegas',
  streamStart: configuredEventStart.includes('2026-08-15')
    ? DEFAULT_EVENT_START
    : configuredEventStart,
  streamStartLabel: 'Sunday 12:00 AM (UK)',
  replayMessage:
    'Your access includes the full live event. Replay available for 24 hours after the broadcast ends.',
  liveUpdateMessage: process.env.NEXT_PUBLIC_LIVE_UPDATE_MESSAGE ?? '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@ufcaccess.co.uk',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk',
  priceLabel: process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live',
  fighter1Stats: {
    name: 'Ryan Garcia',
    nickname: 'KingRy',
    record: '25–2',
    height: "5'10\"",
    reach: '70.5"',
    stance: 'Orthodox',
    country: 'USA',
  } satisfies FighterStats,
  fighter2Stats: {
    name: 'Conor Benn',
    nickname: 'The Destroyer',
    record: '25–1',
    height: "5'9\"",
    reach: '67"',
    stance: 'Orthodox',
    country: 'UK',
  } satisfies FighterStats,
  fightCard: [
    { fighters: 'Ryan Garcia vs Conor Benn', weight: 'WBC Welterweight Title', main: true },
    { fighters: 'Jose Ramirez vs Vlad Panin', weight: 'Super Lightweight' },
    { fighters: 'Noel Mikaelian vs Raphael Akpejiori', weight: 'Heavyweight' },
    { fighters: 'Damazion Vanhouter vs TBA', weight: 'Heavyweight' },
  ] satisfies FightBout[],
  perks: [
    'Full HD live stream',
    'Live chat with paid viewers',
    'Watch on phone, tablet & desktop',
    'Access saved to your account',
  ],
  faq: [
    {
      q: 'Is this the official broadcast?',
      a: `No — ${SITE_NAME} is an independent private live stream. We are not affiliated with any official broadcast partner. You get our HD feed and live chat for a one-time fee.`,
    },
    {
      q: 'Will it work on my phone or TV?',
      a: 'Yes — watch on any modern phone, tablet, or computer. For TV, use AirPlay (iPhone), Chromecast (Android Chrome), or connect your laptop via HDMI.',
    },
    {
      q: 'What if the stream drops?',
      a: 'The player reconnects automatically. If issues persist, refresh the page while logged in — your access is saved to your account.',
    },
    {
      q: 'Can I get a refund?',
      a: 'If the stream is unavailable for a significant portion of the event due to a fault on our side, contact support within 24 hours for a refund review.',
    },
    {
      q: 'Do I need to stay logged in?',
      a: 'Log in once with the same email you used at checkout. Your purchase stays on your account for the event.',
    },
    {
      q: 'When does the stream start?',
      a: 'The broadcast goes live at the scheduled start time shown on this page. You can join early — the player will connect when we go live.',
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
