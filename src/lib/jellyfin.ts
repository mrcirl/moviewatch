import { getSettings } from '@/lib/settings';

export interface JellyfinAvailability {
  available: boolean;
  itemId?: string;
  webUrl?: string;
}

interface JellyfinItem {
  Id: string;
  ProviderIds?: Record<string, string>;
}

// Jellyfin has no server-side "filter by provider id" query param (that's an
// Emby-only extension) — see https://github.com/jellyfin/jellyfin/issues/1990.
// So we pull the whole movie library once (ids + provider ids only, cheap)
// and match TMDB ids client-side. Cached briefly so a watchlist page full of
// cards doesn't re-fetch the entire library once per card.
const CACHE_TTL_MS = 60_000;
let cache: { base: string; byTmdbId: Map<number, JellyfinItem>; expires: number } | null = null;

async function fetchMovieIndex(base: string, apiKey: string): Promise<Map<number, JellyfinItem>> {
  const url = new URL(`${base}/Items`);
  url.searchParams.set('Recursive', 'true');
  url.searchParams.set('IncludeItemTypes', 'Movie');
  url.searchParams.set('Fields', 'ProviderIds');

  const res = await fetch(url.toString(), {
    headers: { 'X-Emby-Token': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Jellyfin request failed (${res.status})`);
  }
  const data = (await res.json()) as { Items?: JellyfinItem[] };

  const byTmdbId = new Map<number, JellyfinItem>();
  for (const item of data.Items ?? []) {
    const providerIds = item.ProviderIds ?? {};
    const tmdbKey = Object.keys(providerIds).find((k) => k.toLowerCase() === 'tmdb');
    const tmdbValue = tmdbKey ? Number(providerIds[tmdbKey]) : NaN;
    if (!Number.isNaN(tmdbValue)) byTmdbId.set(tmdbValue, item);
  }
  return byTmdbId;
}

/** Looks up a movie in the configured Jellyfin server by its TMDB provider id. */
export async function checkJellyfinAvailability(tmdbId: number): Promise<JellyfinAvailability | null> {
  const settings = await getSettings();
  if (!settings.jellyfinUrl || !settings.jellyfinApiKey) return null;

  const base = settings.jellyfinUrl.replace(/\/+$/, '');

  if (!cache || cache.base !== base || cache.expires < Date.now()) {
    const byTmdbId = await fetchMovieIndex(base, settings.jellyfinApiKey);
    cache = { base, byTmdbId, expires: Date.now() + CACHE_TTL_MS };
  }

  const item = cache.byTmdbId.get(tmdbId);
  if (!item) return { available: false };
  return {
    available: true,
    itemId: item.Id,
    webUrl: `${base}/web/index.html#/details?id=${item.Id}`,
  };
}
