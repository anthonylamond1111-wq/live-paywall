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

const DEFAULT_EVENT_START = '2026-08-15T21:30:00.000Z';
const configuredEventStart =
  process.env.NEXT_PUBLIC_EVENT_START_ISO ?? DEFAULT_EVENT_START;

export const EVENT = {
  number: 'UFC 330',
  tagline: 'WELTERWEIGHT TITLE',
  fighter1: 'MAKHACHEV',
  fighter2: 'GARRY',
  venue: 'Xfinity Mobile Arena, Philadelphia',
  streamStart: configuredEventStart.includes('2026-07-11')
    ? DEFAULT_EVENT_START
    : configuredEventStart,
  streamStartLabel: 'Saturday 10:30 PM (UK)',
  replayMessage:
    'Your access includes the full live event. Replay available for 24 hours after the broadcast ends.',
  liveUpdateMessage: process.env.NEXT_PUBLIC_LIVE_UPDATE_MESSAGE ?? '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@ufcaccess.co.uk',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk',
  priceLabel: process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live',
  fighter1Stats: {
    name: 'Islam Makhachev',
    nickname: 'The Eagle',
    record: '28–1',
    height: "5'10\"",
    reach: '70"',
    stance: 'Southpaw',
    country: 'Russia',
  } satisfies FighterStats,
  fighter2Stats: {
    name: 'Ian Machado Garry',
    nickname: 'The Future',
    record: '17–1',
    height: "6'3\"",
    reach: '74"',
    stance: 'Orthodox',
    country: 'Ireland',
  } satisfies FighterStats,
  fightCard: [
    { fighters: 'Islam Makhachev vs Ian Machado Garry', weight: 'Welterweight Title', main: true },
    { fighters: 'Mackenzie Dern vs Gillian Robertson', weight: "Women's Strawweight Title" },
    { fighters: 'Jalin Turner vs Kauê Fernandes', weight: 'Lightweight' },
    { fighters: 'Mansur Abdul-Malik vs Dustin Stoltzfus', weight: 'Middleweight' },
    { fighters: 'Edson Barboza vs Esteban Ribovics', weight: 'Lightweight' },
  ] satisfies FightBout[],
  perks: [
    'Full HD live stream',
    'Live chat with paid viewers',
    'Watch on phone, tablet & desktop',
    'Access saved to your account',
  ],
  faq: [
    {
      q: 'Is this the official UFC broadcast?',
      a: 'No — UFC Access is an independent private live stream. We are not affiliated with UFC or any official broadcast partner. You get our HD feed and live chat for a one-time fee.',
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
