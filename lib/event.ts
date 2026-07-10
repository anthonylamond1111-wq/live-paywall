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

export const EVENT = {
  number: 'UFC 329',
  tagline: 'THE NOTORIOUS RETURNS',
  fighter1: 'MCGREGOR',
  fighter2: 'HOLLOWAY',
  venue: 'T-Mobile Arena, Las Vegas',
  streamStart:
    process.env.NEXT_PUBLIC_EVENT_START_ISO ?? '2026-07-11T21:00:00.000Z',
  streamStartLabel: 'Saturday 10:00 PM (UK)',
  replayMessage:
    'Your access includes the full live event. Replay available for 24 hours after the broadcast ends.',
  liveUpdateMessage: process.env.NEXT_PUBLIC_LIVE_UPDATE_MESSAGE ?? '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@ufcaccess.co.uk',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk',
  priceLabel: process.env.NEXT_PUBLIC_CHECKOUT_LABEL ?? 'Pay £2.50 to Join Live',
  fighter1Stats: {
    name: 'Conor McGregor',
    nickname: 'The Notorious',
    record: '22–6',
    height: "5'9\"",
    reach: '74"',
    stance: 'Southpaw',
    country: 'Ireland',
  } satisfies FighterStats,
  fighter2Stats: {
    name: 'Max Holloway',
    nickname: 'Blessed',
    record: '26–8',
    height: "5'11\"",
    reach: '69"',
    stance: 'Orthodox',
    country: 'USA',
  } satisfies FighterStats,
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
  faq: [
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
