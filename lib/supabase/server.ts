import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getUserFromRequest(request: Request) {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function userHasAccess(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}

export async function recordPurchase(userId: string, stripeSessionId: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('purchases').upsert(
    { user_id: userId, stripe_session_id: stripeSessionId },
    { onConflict: 'stripe_session_id' }
  );

  return !error;
}
