import { NextResponse } from 'next/server';
import { getUserFromRequest, userHasAccess } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paid = await userHasAccess(user.id);
  return NextResponse.json({ paid });
}
