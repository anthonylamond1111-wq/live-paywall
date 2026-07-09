import { NextResponse } from 'next/server';
import { accessCookieOptions, hasPaidAccess } from '@/lib/access-cookie';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false });
    }

    const response = NextResponse.json({ paid: true });
    response.cookies.set(accessCookieOptions(sessionId));
    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
