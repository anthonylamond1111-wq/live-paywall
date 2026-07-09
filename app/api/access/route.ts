import { NextResponse } from 'next/server';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getTokenFromRequest(request);
  const paid = await resolveUserAccess(user, token);
  return NextResponse.json({ paid });
}
