import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeWatchlistItem } from '@/lib/serialize';

const watchlistInclude = {
  movie: true,
  people: { include: { person: true } },
  places: { include: { place: true } },
} as const;

interface Params {
  params: Promise<{ id: string; personId: string }>;
}

/** Marks (or unmarks) whether a specific tagged person has individually watched this film. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id: idParam, personId: personIdParam } = await params;
  const watchlistItemId = Number(idParam);
  const personId = Number(personIdParam);
  if (Number.isNaN(watchlistItemId) || Number.isNaN(personId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const { watched } = body as { watched?: boolean };
  if (typeof watched !== 'boolean') {
    return NextResponse.json({ error: 'watched must be a boolean' }, { status: 400 });
  }

  const link = await prisma.watchlistItemPerson.findUnique({
    where: { watchlistItemId_personId: { watchlistItemId, personId } },
  });
  if (!link) return NextResponse.json({ error: 'This person is not tagged on this film' }, { status: 404 });

  await prisma.watchlistItemPerson.update({
    where: { watchlistItemId_personId: { watchlistItemId, personId } },
    data: { watched },
  });

  const item = await prisma.watchlistItem.findUnique({ where: { id: watchlistItemId }, include: watchlistInclude });
  return NextResponse.json({ item: item ? serializeWatchlistItem(item) : null });
}
