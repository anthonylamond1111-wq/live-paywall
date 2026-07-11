import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { accessCookieOptions } from '@/lib/access-cookie';
import {
  getTokenFromRequest,
  getUserFromRequest,
  recordPurchase,
  resolveUserAccess,
  stripeSessionMatchesUser,
} from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }

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

    if (!stripeSessionMatchesUser(session, user)) {
      return NextResponse.json(
        { error: 'Payment does not match this account' },
        { status: 403 }
      );
    }

    const saved = await recordPurchase(user.id, session.id);
    if (!saved) {
      return NextResponse.json({ error: 'Could not save purchase' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set(accessCookieOptions(sessionId));

    const paid = await resolveUserAccess(user, token);

    return NextResponse.json({ paid });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
