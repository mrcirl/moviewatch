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
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, { append_to_response: 'watch/providers' });
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
