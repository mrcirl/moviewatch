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
  const { name, notes } = await req.json();
  const data: { name?: string; notes?: string | null } = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (notes !== undefined) data.notes = notes;

  try {
    const place = await prisma.place.update({ where: { id }, data });
    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: 'Could not update place' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  await prisma.place.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
