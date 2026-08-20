import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMovieDetails, extractCertification, TmdbNotConfiguredError } from '@/lib/tmdb';
import { serializeWatchlistItem } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

const watchlistInclude = {
  movie: true,
  people: { include: { person: true } },
  places: { include: { place: true } },
} as const;

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const items = await prisma.watchlistItem.findMany({
    include: watchlistInclude,
    orderBy: [{ status: 'asc' }, { addedAt: 'desc' }],
  });
  return NextResponse.json({ items: items.map(serializeWatchlistItem) });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { tmdbId } = await req.json();
  if (typeof tmdbId !== 'number') {
    return NextResponse.json({ error: 'tmdbId is required' }, { status: 400 });
  }

  let movie = await prisma.movie.findUnique({ where: { tmdbId } });
  if (!movie) {
    try {
      const [details, settings] = await Promise.all([getMovieDetails(tmdbId), getSettings()]);
      movie = await prisma.movie.create({
        data: {
          tmdbId: details.id,
          title: details.title,
          year: details.release_date ? Number(details.release_date.slice(0, 4)) : null,
          posterPath: details.poster_path,
          overview: details.overview,
          runtime: details.runtime,
          releaseDate: details.release_date,
          certification: extractCertification(details, settings.tmdbRegion || 'US'),
        },
      });
    } catch (err) {
      if (err instanceof TmdbNotConfiguredError) {
        return NextResponse.json({ error: err.message }, { status: 412 });
      }
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  }

  const item = await prisma.watchlistItem.upsert({
    where: { movieId: movie.id },
    update: {},
    create: { movieId: movie.id },
    include: watchlistInclude,
  });

  return NextResponse.json({ item: serializeWatchlistItem(item) }, { status: 201 });
}
