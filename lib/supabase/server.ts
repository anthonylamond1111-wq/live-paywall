import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import {
  getSessionIdFromAccessToken,
  isMultiDeviceEmail,
} from '@/lib/single-device-auth';

export type GetUserOptions = {
  skipSessionCheck?: boolean;
};

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

export async function getUserFromRequest(
  request: Request,
  options?: GetUserOptions
) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  if (!options?.skipSessionCheck && !isMultiDeviceEmail(data.user.email)) {
    const sessionId = getSessionIdFromAccessToken(token);
    if (!sessionId || !(await isActiveAuthSession(data.user.id, sessionId))) {
      return null;
    }
  }

  return data.user;
}

export async function isActiveAuthSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return true;

  const { data, error } = await supabase
    .from('user_active_sessions')
    .select('session_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Session check error:', error.message);
    return true;
  }

  if (!data) return true;

  return data.session_id === sessionId;
}

export async function registerActiveAuthSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('user_active_sessions').upsert(
    {
      user_id: userId,
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Register session error:', error.message);
  }

  return !error;
}

export async function signOutOtherAuthSessions(accessToken: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;

  const res = await fetch(`${url}/auth/v1/logout?scope=others`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    console.error('Sign out other sessions error:', res.status);
  }
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

export { sessionEmail };

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const normalized = normalizeEmail(email);
  let page = 1;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data.users.length) break;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

export async function ensureUserForCheckout(email: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const normalized = normalizeEmail(email);
  const existingId = await findUserIdByEmail(normalized);
  if (existingId) return existingId;

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalized,
    password: crypto.randomUUID(),
    email_confirm: true,
  });

  if (error) {
    console.error('ensureUserForCheckout error:', error.message);
    return findUserIdByEmail(normalized);
  }

  return data.user.id;
}

export async function confirmSignupUser(email: string, password: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const normalized = normalizeEmail(email);
  const existingId = await findUserIdByEmail(normalized);

  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      email_confirm: true,
      password,
    });
    return !error;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('confirmSignupUser error:', error.message);
  }

  return !error;
}

export async function mintSessionForEmail(email: string) {
  const supabase = getServiceSupabase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabase || !url || !anonKey) return null;

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizeEmail(email),
  });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error('mintSessionForEmail link error:', linkError?.message);
    return null;
  }

  const anonClient = createClient(url, anonKey);
  const { data: sessionData, error: verifyError } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  if (verifyError || !sessionData.session) {
    console.error('mintSessionForEmail verify error:', verifyError?.message);
    return null;
  }

  return sessionData.session;
}

export async function getUserEmailById(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user.email) return null;
  return data.user.email;
}
