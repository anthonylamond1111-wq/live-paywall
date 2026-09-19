import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { attachPaidAccessCookies } from '@/lib/stream-grant-cookie';
import { isCurrentStreamPayment } from '@/lib/stream-access';
import {
  ensureUserForCheckout,
  getUserFromRequest,
  recordPurchase,
  sessionEmail,
  stripeSessionMatchesUser,
} from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request, { skipSessionCheck: true });
    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        paid: false,
        status: session.payment_status,
      });
    }

    if (!isCurrentStreamPayment(session.created)) {
      return NextResponse.json({
        paid: false,
        status: 'expired_event',
      });
    }

    if (user && !stripeSessionMatchesUser(session, user)) {
      return NextResponse.json(
        { error: 'Payment does not match this account' },
        { status: 403 }
      );
    }

    const email = sessionEmail(session);
    if (!email) {
      return NextResponse.json({ error: 'Payment missing email' }, { status: 400 });
    }

    let userId =
      session.metadata?.user_id ?? session.client_reference_id ?? user?.id ?? null;

    if (!userId) {
      userId = await ensureUserForCheckout(email);
    }

    if (userId) {
      await recordPurchase(userId, session.id);
    }

    const response = NextResponse.json({
      paid: true,
      guest: !user,
      email,
    });

    await attachPaidAccessCookies(response, {
      stripeSessionId: session.id,
      email,
      userId,
    });

    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
