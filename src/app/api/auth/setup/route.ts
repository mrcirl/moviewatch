import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSettings, updateSettings } from '@/lib/settings';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const settings = await getSettings();
  if (settings.passwordHash) {
    return NextResponse.json({ error: 'Already set up' }, { status: 400 });
  }
  const { password } = await req.json();
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  await updateSettings({ passwordHash });

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
