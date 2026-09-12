import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { addVisitorMessage, listThreadMessages } from '@/lib/support-store';
import { SUPPORT_THREAD_COOKIE, supportThreadCookieOptions } from '@/lib/support-thread';

export const dynamic = 'force-dynamic';

function getOrCreateThreadId(existing?: string | null) {
  if (existing && existing.length >= 8) return existing;
  return crypto.randomUUID();
}

export async function GET() {
  const cookieStore = await cookies();
  const threadId = getOrCreateThreadId(cookieStore.get(SUPPORT_THREAD_COOKIE)?.value);
  const data = listThreadMessages(threadId);

  const response = NextResponse.json({ messages: data, threadId });
  response.cookies.set(supportThreadCookieOptions(threadId));
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    email?: string;
  };

  const message = body.message?.trim() ?? '';
  if (message.length < 1 || message.length > 1000) {
    return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const threadId = getOrCreateThreadId(cookieStore.get(SUPPORT_THREAD_COOKIE)?.value);
  const email = body.email?.trim().slice(0, 120) || null;

  const data = addVisitorMessage({ threadId, body: message, email });

  const response = NextResponse.json({ message: data });
  response.cookies.set(supportThreadCookieOptions(threadId));
  return response;
}
