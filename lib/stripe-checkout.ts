import { EVENT } from '@/lib/event';

export const STRIPE_CHECKOUT_PRODUCT = {
  name: EVENT.number,
  description: 'Full HD live stream access for the event.',
} as const;

export const STRIPE_CHECKOUT_BRANDING = {
  display_name: 'UFC Access',
  background_color: '#000000',
  button_color: '#ffffff',
  border_style: 'rounded' as const,
  font_family: 'inter' as const,
};

export const STRIPE_CHECKOUT_CUSTOM_TEXT = {
  submit: {
    message: 'Access is saved to your account after payment.',
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
