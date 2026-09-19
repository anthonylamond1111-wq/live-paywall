import { NextResponse } from 'next/server';
import { hasPaidAccess } from '@/lib/access-cookie';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export async function GET(request: Request) {
  if (await hasPaidAccess()) {
    return NextResponse.json({ paid: true, guest: true });
  }

  const user = await getUserFromRequest(request, { skipSessionCheck: true });
  if (user) {
    const token = getTokenFromRequest(request);
    const paid = await resolveUserAccess(user, token);
    return NextResponse.json({ paid });
  }

  return NextResponse.json({ paid: false });
}
