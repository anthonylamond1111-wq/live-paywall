import { NextResponse } from 'next/server';
import { attachPaidAccessCookies } from '@/lib/stream-grant-cookie';
import {
  ensureUserForCheckout,
  findPaidStripeSessionForEmail,
  recordPurchase,
  sessionEmail,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Enter the email you used at checkout' },
        { status: 400 }
      );
    }

    const session = await findPaidStripeSessionForEmail(email);
    if (!session) {
      return NextResponse.json(
        {
          error:
            'No payment found for that email. Use the same email as your Stripe receipt.',
        },
        { status: 404 }
      );
    }

    const paidEmail = sessionEmail(session) ?? email;
    const userId =
      session.metadata?.user_id ??
      session.client_reference_id ??
      (await ensureUserForCheckout(paidEmail));

    if (userId) {
      await recordPurchase(userId, session.id);
    }

    const response = NextResponse.json({
      paid: true,
      email: paidEmail,
      kickedOtherDevices: true,
    });

    // New device token — previous device cookies stop working.
    await attachPaidAccessCookies(response, {
      stripeSessionId: session.id,
      email: paidEmail,
      userId,
    });

    return response;
  } catch (error) {
    console.error('Restore access error:', error);
    return NextResponse.json({ error: 'Could not restore access' }, { status: 500 });
  }
}
