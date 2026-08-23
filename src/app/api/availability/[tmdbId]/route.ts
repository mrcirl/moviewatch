import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { computeAvailability } from '@/lib/availability';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{ tmdbId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const tmdbId = Number((await params).tmdbId);
  if (Number.isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 });

  const movie = await prisma.movie.findUnique({
    where: { tmdbId },
    select: { availabilityJson: true },
  });

  // A film that's never been through the refresh job yet (just added, or
  // added between refreshes) has no cache — fall back to a live check just
  // this once rather than showing nothing until the next scheduled run.
  if (movie?.availabilityJson) {
    return NextResponse.json(JSON.parse(movie.availabilityJson));
  }

  const data = await computeAvailability(tmdbId);
  return NextResponse.json(data);
}
