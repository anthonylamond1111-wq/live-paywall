import { NextResponse } from 'next/server';
import { hasPaidAccess } from '@/lib/access-cookie';
import { attachStreamAccessCookies } from '@/lib/stream-grant-cookie';
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
    if (paid) {
      const response = NextResponse.json({ paid: true });
      await attachStreamAccessCookies(response, user);
      return response;
    }
    return NextResponse.json({ paid: false });
  }

  return NextResponse.json({ paid: false });
}
