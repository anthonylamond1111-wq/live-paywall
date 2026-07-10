import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServiceSupabase();
  let purchases = 0;

  if (supabase) {
    const { count, error } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) {
      purchases = count;
    }
  }

  const displayCount = Math.max(purchases, 12);

  return NextResponse.json({
    purchases,
    displayCount,
  });
}
