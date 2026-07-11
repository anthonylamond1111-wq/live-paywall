'use client';

import { trackEvent } from '@/components/GoogleAnalytics';

export const AnalyticsEvents = {
  PREVIEW_STARTED: 'preview_started',
  PREVIEW_EXPIRED: 'preview_expired',
  UNLOCK_CLICK: 'unlock_click',
  SIGNUP_SUBMIT: 'signup_submit',
  SIGNUP_SUCCESS: 'signup_success',
  LOGIN_SUCCESS: 'login_success',
  CHECKOUT_START: 'checkout_start',
  PURCHASE: 'purchase',
  SHARE: 'share',
  NOTIFY_SIGNUP: 'notify_signup',
} as const;

export function trackAnalytics(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  trackEvent(name, params);
}
