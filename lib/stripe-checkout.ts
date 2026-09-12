import { SITE_NAME } from '@/lib/brand';
import { EVENT } from '@/lib/event';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk';

/** Uploaded fight poster — set STRIPE_CHECKOUT_LOGO_FILE_ID in Railway to override. */
const CHECKOUT_LOGO_FILE_ID =
  process.env.STRIPE_CHECKOUT_LOGO_FILE_ID ?? 'file_1UEvgpC2vh9jCnpmbhdaqaSw';

export const STRIPE_CHECKOUT_PRODUCT = {
  name: `${EVENT.number} — Live Stream Access`,
  description: [
    `Unlock the full ${EVENT.fighter1Stats.name} vs ${EVENT.fighter2Stats.name} live broadcast.`,
    '',
    '• Full HD live stream',
    '• Live chat with paid viewers',
    '• Phone, tablet & TV',
    '• Access saved to your account for tonight',
    '',
    `${EVENT.tagline} · ${EVENT.venue}`,
  ].join('\n'),
} as const;

export const STRIPE_CHECKOUT_BRANDING = {
  display_name: SITE_NAME,
  background_color: '#0a0505',
  button_color: '#dc2626',
  border_style: 'pill' as const,
  font_family: 'inter' as const,
  logo: {
    type: 'file' as const,
    file: CHECKOUT_LOGO_FILE_ID,
  },
  icon: {
    type: 'url' as const,
    url: `${siteUrl}/icon.svg`,
  },
};

export const STRIPE_CHECKOUT_CUSTOM_TEXT = {
  submit: {
    message: `${EVENT.number} · Live tonight · Full HD stream + live chat. Instant access after payment.`,
  },
  after_submit: {
    message: 'Payment received — taking you to the live stream now.',
  },
};

export const STRIPE_EXCLUDED_PAYMENT_METHODS = [
  'klarna',
  'revolut_pay',
  'amazon_pay',
] as const;

export const STRIPE_WALLET_OPTIONS = {
  link: { display: 'never' as const },
};
