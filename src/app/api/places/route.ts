import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const places = await prisma.place.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ places });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { name, notes } = await req.json();
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const place = await prisma.place.create({ data: { name: name.trim(), notes: notes ?? null } });
    return NextResponse.json({ place }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A place with that name already exists' }, { status: 409 });
  }
}
