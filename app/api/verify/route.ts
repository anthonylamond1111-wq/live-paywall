import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { accessCookieOptions } from '@/lib/access-cookie';
import {
  ensureUserForCheckout,
  getTokenFromRequest,
  getUserEmailById,
  getUserFromRequest,
  mintSessionForEmail,
  recordPurchase,
  resolveUserAccess,
  sessionEmail,
  stripeSessionMatchesUser,
} from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const token = getTokenFromRequest(request);
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

    let userId =
      session.metadata?.user_id ?? session.client_reference_id ?? user?.id ?? null;

    if (user) {
      if (!stripeSessionMatchesUser(session, user)) {
        return NextResponse.json(
          { error: 'Payment does not match this account' },
          { status: 403 }
        );
      }
      userId = user.id;
    } else if (!userId) {
      const email = sessionEmail(session);
      if (!email) {
        return NextResponse.json({ error: 'Payment missing email' }, { status: 400 });
      }
      userId = await ensureUserForCheckout(email);
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not link payment' }, { status: 500 });
    }

    const saved = await recordPurchase(userId, session.id);
    if (!saved) {
      return NextResponse.json({ error: 'Could not save purchase' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set(accessCookieOptions(session.id));

    if (!user) {
      const email =
        sessionEmail(session) ?? (await getUserEmailById(userId));
      if (!email) {
        return NextResponse.json({ error: 'Could not sign you in' }, { status: 500 });
      }

      const minted = await mintSessionForEmail(email);
      if (!minted) {
        return NextResponse.json({ error: 'Could not sign you in' }, { status: 500 });
      }

      return NextResponse.json({
        paid: true,
        access_token: minted.access_token,
        refresh_token: minted.refresh_token,
      });
    }

    const paid = await resolveUserAccess(user, token);

    return NextResponse.json({ paid });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
