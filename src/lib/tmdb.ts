import { getSettings } from '@/lib/settings';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w342') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export class TmdbNotConfiguredError extends Error {
  constructor() {
    super('TMDB API key is not configured. Add one in Settings.');
    this.name = 'TmdbNotConfiguredError';
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const settings = await getSettings();
  if (!settings.tmdbApiKey) throw new TmdbNotConfiguredError();

  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set('api_key', settings.tmdbApiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
  runtime: number | null;
  'watch/providers'?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbWatchProvider[];
        rent?: TmdbWatchProvider[];
        buy?: TmdbWatchProvider[];
      }
    >;
  };
  release_dates?: {
    results?: {
      iso_3166_1: string;
      release_dates: { certification: string; type: number }[];
    }[];
  };
  videos?: {
    results?: {
      key: string;
      site: string;
      type: string;
      official: boolean;
    }[];
  };
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/search/movie', {
    query,
    include_adult: 'false',
  });
  return data.results;
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: 'watch/providers,release_dates,videos',
  });
}

/** Age/content rating (e.g. "PG-13") for the given region, or null if TMDB has none on file. */
export function extractCertification(details: TmdbMovieDetails, region: string): string | null {
  const forRegion = details.release_dates?.results?.find((r) => r.iso_3166_1 === region);
  const withCert = forRegion?.release_dates.find((r) => r.certification.trim() !== '');
  return withCert?.certification || null;
}

/** YouTube video key for the best trailer TMDB has on file (official over unofficial), or null. */
export function extractTrailerKey(details: TmdbMovieDetails): string | null {
  const videos = (details.videos?.results ?? []).filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  const best = videos.find((v) => v.official) ?? videos[0];
  return best?.key ?? null;
}

export function trailerUrl(key: string | null | undefined): string | null {
  return key ? `https://www.youtube.com/watch?v=${key}` : null;
}

/** Watch-provider availability for the configured region (defaults to US). */
export async function getWatchProviders(tmdbId: number) {
  const settings = await getSettings();
  const details = await getMovieDetails(tmdbId);
  const region = settings.tmdbRegion || 'US';
  const forRegion = details['watch/providers']?.results?.[region];
  return {
    link: forRegion?.link ?? null,
    flatrate: forRegion?.flatrate ?? [],
    rent: forRegion?.rent ?? [],
    buy: forRegion?.buy ?? [],
  };
}

export interface TmdbGenre {
  id: number;
  name: string;
}

// TMDB's genre list is effectively static; a long cache avoids re-fetching
// it on every /recommended page view.
const GENRES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let genresCache: { genres: TmdbGenre[]; expires: number } | null = null;

export async function getGenres(): Promise<TmdbGenre[]> {
  if (genresCache && genresCache.expires > Date.now()) return genresCache.genres;
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list');
  genresCache = { genres: data.genres, expires: Date.now() + GENRES_CACHE_TTL_MS };
  return data.genres;
}

export interface TmdbDiscoverResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  vote_average: number;
}

// "Top of the 1990s" doesn't change day to day, so cache each genre/decade
// combination for a while — the /recommended page fires one Discover call
// per genre, and this keeps repeat visits (and re-toggling decade tabs) from
// re-hitting TMDB every time.
const DISCOVER_CACHE_TTL_MS = 60 * 60 * 1000;
const discoverCache = new Map<string, { results: TmdbDiscoverResult[]; expires: number }>();

/** Top-rated movies (by TMDB rating, with a minimum vote count to filter out obscure outliers) for a genre, optionally within a year range. */
export async function discoverTopMovies(params: {
  genreId: number;
  yearFrom?: number;
  yearTo?: number;
}): Promise<TmdbDiscoverResult[]> {
  const key = `${params.genreId}:${params.yearFrom ?? ''}:${params.yearTo ?? ''}`;
  const cached = discoverCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.results;

  const query: Record<string, string> = {
    with_genres: String(params.genreId),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
    include_adult: 'false',
    include_video: 'false',
  };
  if (params.yearFrom) query['primary_release_date.gte'] = `${params.yearFrom}-01-01`;
  if (params.yearTo) query['primary_release_date.lte'] = `${params.yearTo}-12-31`;

  const data = await tmdbFetch<{ results: TmdbDiscoverResult[] }>('/discover/movie', query);
  discoverCache.set(key, { results: data.results, expires: Date.now() + DISCOVER_CACHE_TTL_MS });
  return data.results;
}
