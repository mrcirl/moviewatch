import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const people = await prisma.person.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ people });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { name, color } = await req.json();
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const person = await prisma.person.create({ data: { name: name.trim(), color: color ?? null } });
    return NextResponse.json({ person }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A person with that name already exists' }, { status: 409 });
  }
}
