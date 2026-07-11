import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAuthedSupabase(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function getUserFromRequest(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function queryPurchaseExists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    // Table missing or RLS — fall through to Stripe check
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function userHasAccess(
  userId: string,
  accessToken?: string | null
): Promise<boolean> {
  const service = getServiceSupabase();
  if (service) {
    const hasPurchase = await queryPurchaseExists(service, userId);
    if (hasPurchase) return true;
  }

  if (accessToken) {
    const authed = getAuthedSupabase(accessToken);
    if (authed) {
      const hasPurchase = await queryPurchaseExists(authed, userId);
      if (hasPurchase) return true;
    }
  }

  return false;
}

export async function recordPurchase(userId: string, stripeSessionId: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('purchases').upsert(
    { user_id: userId, stripe_session_id: stripeSessionId },
    { onConflict: 'stripe_session_id' }
  );

  if (error) {
    console.error('Failed to record purchase:', error.message);
  }

  return !error;
}

function sessionEmail(session: {
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
}) {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

export function stripeSessionMatchesUser(
  session: {
    metadata?: { user_id?: string } | null;
    client_reference_id?: string | null;
    customer_email?: string | null;
    customer_details?: { email?: string | null } | null;
  },
  user: User
) {
  const sessionUserId = session.metadata?.user_id ?? session.client_reference_id;
  if (sessionUserId) {
    return sessionUserId === user.id;
  }

  const email = sessionEmail(session);
  if (!email || !user.email) return false;
  return email.toLowerCase() === user.email.toLowerCase();
}

function isPaidCheckoutSession(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid' || session.status === 'complete';
}

export async function findPaidStripeSessionForUser(
  user: User
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe();
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  let startingAfter: string | undefined;

  for (let page = 0; page < 10; page++) {
    const sessions = await stripe.checkout.sessions.list({
      status: 'complete',
      limit: 100,
      created: { gte: since },
      starting_after: startingAfter,
    });

    for (const checkoutSession of sessions.data) {
      if (!isPaidCheckoutSession(checkoutSession)) continue;
      if (stripeSessionMatchesUser(checkoutSession, user)) {
        return checkoutSession;
      }
    }

    if (!sessions.has_more || sessions.data.length === 0) break;
    startingAfter = sessions.data[sessions.data.length - 1].id;
  }

  return null;
}

export async function syncStripePurchasesForUser(user: User): Promise<boolean> {
  const checkoutSession = await findPaidStripeSessionForUser(user);
  if (!checkoutSession) return false;

  return recordPurchase(user.id, checkoutSession.id);
}

export async function resolveUserAccess(
  user: User,
  accessToken?: string | null
): Promise<boolean> {
  if (await userHasAccess(user.id, accessToken)) {
    return true;
  }

  return syncStripePurchasesForUser(user);
}
