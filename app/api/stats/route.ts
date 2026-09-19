import { NextResponse } from 'next/server';
import { ACTIVE_VISITOR_SECONDS } from '@/lib/visitor-session';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServiceSupabase();
  let purchases = 0;
  let watchingNow = 0;
  let activeNow = 0;

  if (supabase) {
    const since = new Date(Date.now() - ACTIVE_VISITOR_SECONDS * 1000).toISOString();

    const [purchaseRes, streamRes, siteRes] = await Promise.all([
      supabase.from('purchases').select('*', { count: 'exact', head: true }),
      supabase
        .from('site_visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('view', 'stream')
        .gte('last_seen', since),
      supabase
        .from('site_visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', since),
    ]);

    if (!purchaseRes.error && purchaseRes.count !== null) {
      purchases = purchaseRes.count;
    }
    if (!streamRes.error && streamRes.count !== null) {
      watchingNow = streamRes.count;
    }
    if (!siteRes.error && siteRes.count !== null) {
      activeNow = siteRes.count;
    }
  }

  const displayCount = Math.max(purchases, 12);

  return NextResponse.json({
    purchases,
    displayCount,
    watchingNow,
    activeNow,
  });
}
