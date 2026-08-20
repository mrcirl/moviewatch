import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSettings } from '@/lib/settings';
import { verifyPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const settings = await getSettings();
  if (!settings.passwordHash) {
    return NextResponse.json({ error: 'Not set up yet' }, { status: 400 });
  }
  const { password } = await req.json();
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const valid = await verifyPassword(password, settings.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
