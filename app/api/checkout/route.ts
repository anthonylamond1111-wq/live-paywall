import { NextResponse } from 'next/server';
import { STRIPE_PRICE_ID, STRIPE_PRODUCT_ID } from '@/lib/constants';
import { getStripe } from '@/lib/stripe';

async function resolvePriceId(): Promise<string | null> {
  if (STRIPE_PRICE_ID) return STRIPE_PRICE_ID;

  if (!STRIPE_PRODUCT_ID) return null;

  const stripe = getStripe();
  const product = await stripe.products.retrieve(STRIPE_PRODUCT_ID);

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
          error:
            'Stripe product not configured. Set STRIPE_PRODUCT_ID or STRIPE_PRICE_ID in Railway variables.',
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
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
