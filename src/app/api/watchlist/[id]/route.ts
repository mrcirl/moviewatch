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
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const { status, notes, rating, personIds, placeIds } = body as {
    status?: 'WANT_TO_WATCH' | 'WATCHED';
    notes?: string | null;
    rating?: number | null;
    personIds?: number[];
    placeIds?: number[];
  };
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'rating must be an integer from 1 to 5, or null' }, { status: 400 });
  }

  const existing = await prisma.watchlistItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const data: {
      status?: 'WANT_TO_WATCH' | 'WATCHED';
      notes?: string | null;
      rating?: number | null;
      watchedAt?: Date | null;
    } = {};
    if (status) {
      data.status = status;
      data.watchedAt = status === 'WATCHED' ? new Date() : null;
    }
    if (notes !== undefined) data.notes = notes;
    if (rating !== undefined) data.rating = rating;
    if (Object.keys(data).length > 0) {
      await tx.watchlistItem.update({ where: { id }, data });
    }

    if (personIds) {
      await tx.watchlistItemPerson.deleteMany({ where: { watchlistItemId: id } });
      if (personIds.length > 0) {
        await tx.watchlistItemPerson.createMany({
          data: personIds.map((personId) => ({ watchlistItemId: id, personId })),
        });
      }
    }

    if (placeIds) {
      await tx.watchlistItemPlace.deleteMany({ where: { watchlistItemId: id } });
      if (placeIds.length > 0) {
        await tx.watchlistItemPlace.createMany({
          data: placeIds.map((placeId) => ({ watchlistItemId: id, placeId })),
        });
      }
    }
  });

  const item = await prisma.watchlistItem.findUnique({ where: { id }, include: watchlistInclude });
  return NextResponse.json({ item: item ? serializeWatchlistItem(item) : null });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await prisma.watchlistItem.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
