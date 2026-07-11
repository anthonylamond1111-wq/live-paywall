import { NextResponse } from 'next/server';
import { isSiteAdmin } from '@/lib/site-admin';
import { ACTIVE_VISITOR_SECONDS } from '@/lib/visitor-session';
import { GA_MEASUREMENT_ID } from '@/lib/constants';
import { getUserFromRequest, getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireSiteAdmin(request: Request) {
  const user = await getUserFromRequest(request, { skipSessionCheck: true });
  if (!user || !isSiteAdmin(user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const result = await requireSiteAdmin(request);
  if ('error' in result && result.error) return result.error;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 });
  }

  const since = new Date(Date.now() - ACTIVE_VISITOR_SECONDS * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  await supabase
    .from('site_visitor_sessions')
    .delete()
    .lt('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const [siteVisitors, streamViewers, purchasesTotal, purchasesHour, purchasesToday, notifyTotal] =
    await Promise.all([
      supabase
        .from('site_visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('view', 'site')
        .gte('last_seen', since),
      supabase
        .from('site_visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('view', 'stream')
        .gte('last_seen', since),
      supabase.from('purchases').select('*', { count: 'exact', head: true }),
      supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo),
      supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('notify_signups').select('*', { count: 'exact', head: true }),
    ]);

  const gaId = GA_MEASUREMENT_ID;

  return NextResponse.json({
    activeWindowSeconds: ACTIVE_VISITOR_SECONDS,
    activeOnSite: siteVisitors.count ?? 0,
    watchingStream: streamViewers.count ?? 0,
    purchasesTotal: purchasesTotal.count ?? 0,
    purchasesLastHour: purchasesHour.count ?? 0,
    purchasesToday: purchasesToday.count ?? 0,
    notifySignups: notifyTotal.count ?? 0,
    updatedAt: new Date().toISOString(),
    gaConfigured: Boolean(gaId),
    gaMeasurementId: gaId ? `${gaId.slice(0, 2)}…${gaId.slice(-4)}` : null,
  });
}
