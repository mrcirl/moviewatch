import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { searchMovies, posterUrl, TmdbNotConfiguredError } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const q = req.nextUrl.searchParams.get('q') ?? '';
  try {
    const results = await searchMovies(q);
    const tmdbIds = results.map((r) => r.id);
    const existing = await prisma.movie.findMany({
      where: { tmdbId: { in: tmdbIds } },
      select: { tmdbId: true, watchlistItems: { select: { id: true } } },
    });
    const inWatchlist = new Set(
      existing.filter((m) => m.watchlistItems.length > 0).map((m) => m.tmdbId)
    );

    return NextResponse.json({
      results: results.map((r) => ({
        tmdbId: r.id,
        title: r.title,
        year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
        posterUrl: posterUrl(r.poster_path),
        overview: r.overview,
        inWatchlist: inWatchlist.has(r.id),
      })),
    });
  } catch (err) {
    if (err instanceof TmdbNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 412 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
