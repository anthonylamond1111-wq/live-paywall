import { NextResponse } from 'next/server';
import { STRIPE_PRICE_ID } from '@/lib/constants';
import { getStripe } from '@/lib/stripe';

function isStripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');
}

function getProductIdForMode() {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_PRODUCT_ID ?? 'prod_Ur1ON2doXy6N8B';
  }

  return process.env.STRIPE_PRODUCT_ID ?? '';
}

async function resolvePriceId(): Promise<string | null> {
  if (STRIPE_PRICE_ID) return STRIPE_PRICE_ID;

  const productId = getProductIdForMode();
  if (!productId) return null;

  const stripe = getStripe();
  const product = await stripe.products.retrieve(productId);

  if (!product.default_price) return null;

  return typeof product.default_price === 'string'
    ? product.default_price
    : product.default_price.id;
}

export async function POST() {
  try {
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
      line_items: [{ quantity: 1, price: priceId }],
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
