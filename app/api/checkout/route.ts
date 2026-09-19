import { NextResponse } from 'next/server';
import {
  STRIPE_CHECKOUT_BRANDING,
  STRIPE_CHECKOUT_CUSTOM_TEXT,
  STRIPE_EXCLUDED_PAYMENT_METHODS,
  STRIPE_WALLET_OPTIONS,
} from '@/lib/stripe-checkout';
import { getStripe } from '@/lib/stripe';
import { resolvePromotionCodeId } from '@/lib/stripe-promo';
import { hasPaidAccess } from '@/lib/access-cookie';
import {
  ensureUserForCheckout,
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readRuntimeEnv(key: string): string | undefined {
  return process.env[key];
}

function isStripeTestMode() {
  return (readRuntimeEnv('STRIPE_SECRET_KEY') ?? '').startsWith('sk_test_');
}

const LIVE_PRODUCT_FALLBACK = 'prod_V4vYaTX0Q3L8RO';
const TEST_PRODUCT_FALLBACK = 'prod_Ur1ON2doXy6N8B';
const LIVE_PRICE_FALLBACK = 'price_1U4lh3C2vh9jCnpmysfjdndg';

function getProductIdCandidates(): string[] {
  const configured = isStripeTestMode()
    ? readRuntimeEnv('STRIPE_TEST_PRODUCT_ID')
    : readRuntimeEnv('STRIPE_PRODUCT_ID');
  const fallback = isStripeTestMode() ? TEST_PRODUCT_FALLBACK : LIVE_PRODUCT_FALLBACK;

  return [...new Set([configured, fallback].filter(Boolean) as string[])];
}

async function resolvePriceId(): Promise<string | null> {
  const stripe = getStripe();

  for (const productId of getProductIdCandidates()) {
    try {
      const product = await stripe.products.retrieve(productId);
      if (!product.active || !product.default_price) continue;

      return typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price.id;
    } catch {
      continue;
    }
  }

  const fallbackPriceId = isStripeTestMode()
    ? process.env.STRIPE_TEST_PRICE_ID
    : process.env.STRIPE_LIVE_PRICE_ID ?? LIVE_PRICE_FALLBACK;

  return fallbackPriceId ?? null;
}

function friendlyCheckoutError(error: string): string {
  if (/rate limit|rate exceeded|too many.*email/i.test(error)) {
    return 'Too many attempts right now. Wait a minute, then try again.';
  }
  return error;
}

function arePaymentsEnabled() {
  const value = (readRuntimeEnv('PAYMENTS_ENABLED') ?? '').trim().toLowerCase();
  return value !== 'false';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    if (!arePaymentsEnabled()) {
      return NextResponse.json(
        { error: 'Sales are closed for this event.', paymentsDisabled: true },
        { status: 403 }
      );
    }

    if (await hasPaidAccess()) {
      return NextResponse.json(
        { error: 'This device already has access', alreadyPaid: true },
        { status: 409 }
      );
    }

    const user = await getUserFromRequest(request);
    const token = getTokenFromRequest(request);
    if (user && (await resolveUserAccess(user, token))) {
      return NextResponse.json(
        { error: 'You already have access for this event', alreadyPaid: true },
        { status: 409 }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      email?: string;
      promotionCode?: string;
    };

    const guestEmail = payload.email?.trim().toLowerCase() ?? '';
    if (guestEmail && !isValidEmail(guestEmail)) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    }

    const promotionCodeInput = payload.promotionCode?.trim() ?? '';
    let promotionCodeId: string | null = null;
    if (promotionCodeInput) {
      promotionCodeId = await resolvePromotionCodeId(promotionCodeInput);
      if (!promotionCodeId) {
        return NextResponse.json(
          { error: 'That discount code is invalid or expired.' },
          { status: 400 }
        );
      }
    }

    const priceId = await resolvePriceId();
    if (!priceId) {
      return NextResponse.json(
        {
          error: isStripeTestMode()
            ? 'Stripe test product not configured. Set STRIPE_TEST_PRODUCT_ID in Railway.'
            : 'Stripe live product not configured. Set STRIPE_PRODUCT_ID in Railway.',
        },
        { status: 500 }
      );
    }

    const checkoutEmail = user?.email ?? (guestEmail || undefined);
    let userId = user?.id ?? null;
    if (!userId && checkoutEmail) {
      userId = await ensureUserForCheckout(checkoutEmail);
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      excluded_payment_method_types: [...STRIPE_EXCLUDED_PAYMENT_METHODS],
      wallet_options: STRIPE_WALLET_OPTIONS,
      customer_email: checkoutEmail,
      client_reference_id: userId ?? undefined,
      metadata: {
        guest: user ? '0' : '1',
        ...(userId ? { user_id: userId } : {}),
        ...(promotionCodeInput ? { promotion_code: promotionCodeInput } : {}),
      },
      line_items: [{ quantity: 1, price: priceId }],
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
      branding_settings: STRIPE_CHECKOUT_BRANDING,
      custom_text: STRIPE_CHECKOUT_CUSTOM_TEXT,
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message =
      error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: friendlyCheckoutError(message) }, { status: 500 });
  }
}
