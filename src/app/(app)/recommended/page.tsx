import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getGenres, discoverTopMovies, posterUrl, TmdbNotConfiguredError } from '@/lib/tmdb';
import RecommendedClient, { type RecommendedRow } from './recommended-client';

const DECADES = [
  { value: 'ALL', label: 'All time', from: undefined, to: undefined },
  { value: '1960s', label: '1960s', from: 1960, to: 1969 },
  { value: '1970s', label: '1970s', from: 1970, to: 1979 },
  { value: '1980s', label: '1980s', from: 1980, to: 1989 },
  { value: '1990s', label: '1990s', from: 1990, to: 1999 },
  { value: '2000s', label: '2000s', from: 2000, to: 2009 },
  { value: '2010s', label: '2010s', from: 2010, to: 2019 },
  { value: '2020s', label: '2020s', from: 2020, to: undefined },
] as const;

export default async function RecommendedPage({
  searchParams,
}: {
  searchParams: Promise<{ decade?: string }>;
}) {
  const { decade: decadeParam } = await searchParams;
  const decade = DECADES.find((d) => d.value === decadeParam) ?? DECADES[0];

  let rows: RecommendedRow[] = [];
  let error: string | null = null;

  try {
    const genres = await getGenres();

    const existing = await prisma.movie.findMany({
      select: { tmdbId: true, watchlistItems: { select: { id: true } } },
    });
    const onWatchlist = new Set(existing.filter((m) => m.watchlistItems.length > 0).map((m) => m.tmdbId));

    const results = await Promise.all(
      genres.map(async (g) => {
        const movies = await discoverTopMovies({ genreId: g.id, yearFrom: decade.from, yearTo: decade.to });
        return {
          genreId: g.id,
          genreName: g.name,
          movies: movies
            .filter((m) => !onWatchlist.has(m.id))
            .slice(0, 20)
            .map((m) => ({
              tmdbId: m.id,
              title: m.title,
              year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
              posterUrl: posterUrl(m.poster_path),
              voteAverage: m.vote_average,
            })),
        };
      }),
    );
    rows = results.filter((r) => r.movies.length > 0);
  } catch (err) {
    error = err instanceof TmdbNotConfiguredError ? err.message : (err as Error).message;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-base-200">Recommended</h1>
        <p className="text-sm text-base-400">
          Top-rated films by genre. Already-watchlisted films are hidden — this is for finding what&apos;s next.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-base-900 p-1">
        {DECADES.map((d) => (
          <Link
            key={d.value}
            href={`/recommended?decade=${d.value}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              decade.value === d.value ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200'
            }`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && rows.length === 0 && (
        <p className="text-sm text-base-400">Nothing to show for this decade — try a different one.</p>
      )}

      <RecommendedClient rows={rows} />
    </div>
  );
}
