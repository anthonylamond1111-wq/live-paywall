import { EVENT } from '@/lib/event';

export const STRIPE_CHECKOUT_PRODUCT = {
  name: `${EVENT.number} Live Stream`,
  description:
    'One-time access to the full HD live broadcast. Includes live chat and saved account access for the event.',
} as const;

export const STRIPE_CHECKOUT_BRANDING = {
  display_name: 'UFC Access',
  background_color: '#0a0a0a',
  button_color: '#ffffff',
  border_style: 'rounded' as const,
  font_family: 'inter' as const,
};

export const STRIPE_CHECKOUT_CUSTOM_TEXT = {
  submit: {
    message: 'Your stream access is saved to the email above after payment.',
  },
};
