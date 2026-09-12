import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { accessCookieOptions } from '@/lib/access-cookie';
import { attachStreamAccessCookies } from '@/lib/stream-grant-cookie';
import { isCurrentStreamPayment } from '@/lib/stream-access';
import {
  ensureUserForCheckout,
  getTokenFromRequest,
  getUserEmailById,
  getUserFromRequest,
  mintSessionForEmail,
  recordPurchase,
  registerActiveAuthSession,
  resolveUserAccess,
  sessionEmail,
  signOutOtherAuthSessions,
  stripeSessionMatchesUser,
} from '@/lib/supabase/server';
import {
  getSessionIdFromAccessToken,
  isMultiDeviceEmail,
} from '@/lib/single-device-auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request, { skipSessionCheck: true });
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

    if (!isCurrentStreamPayment(session.created)) {
      return NextResponse.json({
        paid: false,
        status: 'expired_event',
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

    if (!user) {
      const email =
        sessionEmail(session) ?? (await getUserEmailById(userId));
      if (!email) {
        return NextResponse.json({ error: 'Could not sign you in' }, { status: 500 });
      }

      const minted = await mintSessionForEmail(email);
      if (!minted) {
        return NextResponse.json({
          paid: true,
          needsPassword: true,
          email,
        });
      }

      if (!isMultiDeviceEmail(email)) {
        const authSessionId = getSessionIdFromAccessToken(minted.access_token);
        if (authSessionId) {
          await registerActiveAuthSession(userId, authSessionId);
          await signOutOtherAuthSessions(minted.access_token);
        }
      }

      const response = NextResponse.json({
        paid: true,
        access_token: minted.access_token,
        refresh_token: minted.refresh_token,
      });
      response.cookies.set(accessCookieOptions(session.id));
      await attachStreamAccessCookies(response, { id: userId, email: email ?? undefined });
      return response;
    }

    const paid = await resolveUserAccess(user, token);
    const response = NextResponse.json({ paid });
    response.cookies.set(accessCookieOptions(session.id));
    await attachStreamAccessCookies(response, user);
    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
