import { NextResponse } from 'next/server';
import { STRIPE_PRICE_ID } from '@/lib/constants';
import { getStripe } from '@/lib/stripe';

export async function POST() {
  try {
    if (!STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID is not configured. Add your live Stripe price ID in Railway variables.' },
        { status: 500 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price: STRIPE_PRICE_ID }],
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
