import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { createSeerrRequest } from '@/lib/seerr';

export async function POST(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { tmdbId } = await req.json();
  if (typeof tmdbId !== 'number') {
    return NextResponse.json({ error: 'tmdbId is required' }, { status: 400 });
  }

  try {
    const request = await createSeerrRequest(tmdbId);
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
