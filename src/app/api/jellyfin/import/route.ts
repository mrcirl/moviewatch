import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getJellyfinMovieIndex } from '@/lib/jellyfin';
import { getMovieDetails, extractCertification, extractTrailerKey, extractGenreNames, TmdbNotConfiguredError } from '@/lib/tmdb';
import { getSettings } from '@/lib/settings';

const CONCURRENCY = 5;

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * Adds every Jellyfin library movie (matched via TMDB provider id) that isn't
 * already on the watchlist, as a new "want to watch" entry.
 */
export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const settings = await getSettings();
  if (!settings.tmdbApiKey) {
    return NextResponse.json({ error: 'TMDB API key is not configured. Add one in Settings.' }, { status: 412 });
  }

  let index;
  try {
    index = await getJellyfinMovieIndex({ force: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  if (!index) {
    return NextResponse.json(
      { error: 'Jellyfin is not configured. Add a server URL and API key in Settings.' },
      { status: 412 },
    );
  }

  const existing = await prisma.watchlistItem.findMany({ include: { movie: true } });
  const existingTmdbIds = new Set(existing.map((item) => item.movie.tmdbId));

  const jellyfinTmdbIds = [...index.keys()];
  const toImport = jellyfinTmdbIds.filter((id) => !existingTmdbIds.has(id));
  const region = settings.tmdbRegion || 'US';

  let imported = 0;
  const failures: string[] = [];

  await mapWithConcurrency(toImport, CONCURRENCY, async (tmdbId) => {
    try {
      let movie = await prisma.movie.findUnique({ where: { tmdbId } });
      if (!movie) {
        const details = await getMovieDetails(tmdbId);
        movie = await prisma.movie.create({
          data: {
            tmdbId: details.id,
            title: details.title,
            year: details.release_date ? Number(details.release_date.slice(0, 4)) : null,
            posterPath: details.poster_path,
            overview: details.overview,
            runtime: details.runtime,
            releaseDate: details.release_date,
            certification: extractCertification(details, region),
            trailerKey: extractTrailerKey(details),
            genres: extractGenreNames(details).join(','),
          },
        });
      }
      await prisma.watchlistItem.upsert({
        where: { movieId: movie.id },
        update: {},
        create: { movieId: movie.id, imported: true },
      });
      imported++;
    } catch (err) {
      const message = err instanceof TmdbNotConfiguredError ? err.message : (err as Error).message;
      failures.push(`TMDB ${tmdbId}: ${message}`);
    }
  });

  return NextResponse.json({
    consideredFromJellyfin: jellyfinTmdbIds.length,
    alreadyOnWatchlist: jellyfinTmdbIds.length - toImport.length,
    imported,
    failed: failures.length,
    failures: failures.slice(0, 20),
  });
}
