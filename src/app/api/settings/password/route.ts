import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, hashPassword, verifyPassword } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/settings';

export async function PUT(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { currentPassword, newPassword } = await req.json();
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  const settings = await getSettings();
  if (!settings.passwordHash || typeof currentPassword !== 'string') {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
  }
  const valid = await verifyPassword(currentPassword, settings.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await updateSettings({ passwordHash });
  return NextResponse.json({ ok: true });
}
