import { NextResponse } from 'next/server';
import { confirmSignupUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password required' }, { status: 400 });
    }

    const result = await confirmSignupUser(email.trim(), password);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Could not confirm account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Confirm signup error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
