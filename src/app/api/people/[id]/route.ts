import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  const { name, color } = await req.json();
  const data: { name?: string; color?: string | null } = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (color !== undefined) data.color = color;

  try {
    const person = await prisma.person.update({ where: { id }, data });
    return NextResponse.json({ person });
  } catch {
    return NextResponse.json({ error: 'Could not update person' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  await prisma.person.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
