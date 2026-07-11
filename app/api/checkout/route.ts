import { NextResponse } from 'next/server';
import {
  STRIPE_CHECKOUT_BRANDING,
  STRIPE_CHECKOUT_CUSTOM_TEXT,
  STRIPE_EXCLUDED_PAYMENT_METHODS,
  STRIPE_WALLET_OPTIONS,
} from '@/lib/stripe-checkout';
import { getStripe } from '@/lib/stripe';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

function isStripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');
}

function getProductIdForMode() {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_PRODUCT_ID ?? 'prod_Ur1ON2doXy6N8B';
  }

  return process.env.STRIPE_PRODUCT_ID ?? 'prod_Ur1s5kDE1mccbJ';
}

async function resolvePriceId(): Promise<string | null> {
  const productId = getProductIdForMode();

  if (productId) {
    const stripe = getStripe();
    const product = await stripe.products.retrieve(productId);

    if (product.default_price) {
      return typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price.id;
    }
  }

  const fallbackPriceId = isStripeTestMode()
    ? process.env.STRIPE_TEST_PRICE_ID
    : process.env.STRIPE_LIVE_PRICE_ID;

  return fallbackPriceId ?? null;
}

function friendlyCheckoutError(error: string): string {
  if (/rate limit|rate exceeded|too many.*email/i.test(error)) {
    return 'Too many attempts right now. Wait a minute, then try again.';
  }
  return error;
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const token = getTokenFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Create an account and log in before paying.' },
        { status: 401 }
      );
    }

    if (await resolveUserAccess(user, token)) {
      return NextResponse.json(
        { error: 'You already have access for this event', alreadyPaid: true },
        { status: 409 }
      );
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

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      excluded_payment_method_types: [...STRIPE_EXCLUDED_PAYMENT_METHODS],
      wallet_options: STRIPE_WALLET_OPTIONS,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      line_items: [{ quantity: 1, price: priceId }],
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
