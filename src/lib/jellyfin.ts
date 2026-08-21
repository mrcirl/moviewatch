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

/**
 * The Jellyfin movie library indexed by TMDB id. Cached for CACHE_TTL_MS;
 * pass `force: true` to bypass the cache and re-fetch immediately (used by
 * the manual "resync" action). Returns null if Jellyfin isn't configured.
 */
export async function getJellyfinMovieIndex(opts: { force?: boolean } = {}): Promise<Map<number, JellyfinItem> | null> {
  const settings = await getSettings();
  if (!settings.jellyfinUrl || !settings.jellyfinApiKey) return null;

  const base = settings.jellyfinUrl.replace(/\/+$/, '');

  if (opts.force || !cache || cache.base !== base || cache.expires < Date.now()) {
    const byTmdbId = await fetchMovieIndex(base, settings.jellyfinApiKey);
    cache = { base, byTmdbId, expires: Date.now() + CACHE_TTL_MS };
  }

  return cache.byTmdbId;
}

/** Looks up a movie in the configured Jellyfin server by its TMDB provider id. */
export async function checkJellyfinAvailability(tmdbId: number): Promise<JellyfinAvailability | null> {
  const settings = await getSettings();
  if (!settings.jellyfinUrl || !settings.jellyfinApiKey) return null;
  const base = settings.jellyfinUrl.replace(/\/+$/, '');

  const index = await getJellyfinMovieIndex();
  const item = index?.get(tmdbId);
  if (!item) return { available: false };
  return {
    available: true,
    itemId: item.Id,
    webUrl: `${base}/web/index.html#/details?id=${item.Id}`,
  };
}

export type PlaylistSyncResult = { ok: true; itemCount: number } | { ok: false; error: string };

interface JellyfinUser {
  Id: string;
  Policy?: { IsAdministrator?: boolean };
}

/**
 * A server-held API key isn't itself a user, but a Jellyfin playlist must be
 * owned by one — use the first administrator account found (falling back to
 * whatever user comes first) as the owner for playlists this app creates.
 */
async function fetchOwnerUserId(base: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${base}/Users`, { headers: { 'X-Emby-Token': apiKey }, cache: 'no-store' });
  if (!res.ok) return null;
  const users = (await res.json()) as JellyfinUser[];
  return users.find((u) => u.Policy?.IsAdministrator)?.Id ?? users[0]?.Id ?? null;
}

/**
 * Creates or fully replaces a playlist titled "MovieWatch: {personName}"
 * containing the given TMDB-id movies (matched against the Jellyfin library
 * — ids with no match are silently skipped). Resyncing deletes any existing
 * playlist of that name first and recreates it: Jellyfin's playlist-items
 * endpoints reject pure API-key auth (they require a resolvable user
 * session), but deleting/creating whole playlists works fine.
 */
export async function syncJellyfinPlaylist(personName: string, tmdbIds: number[]): Promise<PlaylistSyncResult> {
  const settings = await getSettings();
  if (!settings.jellyfinUrl || !settings.jellyfinApiKey) return { ok: false, error: 'Jellyfin is not configured.' };
  const base = settings.jellyfinUrl.replace(/\/+$/, '');
  const apiKey = settings.jellyfinApiKey;

  const [index, userId] = await Promise.all([getJellyfinMovieIndex(), fetchOwnerUserId(base, apiKey)]);
  if (!index) return { ok: false, error: 'Jellyfin is not configured.' };
  if (!userId) return { ok: false, error: 'Could not find a Jellyfin user to own the playlist.' };

  const title = `MovieWatch: ${personName}`;

  const listRes = await fetch(
    `${base}/Users/${userId}/Items?${new URLSearchParams({ IncludeItemTypes: 'Playlist', Recursive: 'true' })}`,
    { headers: { 'X-Emby-Token': apiKey }, cache: 'no-store' },
  );
  if (listRes.ok) {
    const data = (await listRes.json()) as { Items?: { Id: string; Name: string }[] };
    const match = data.Items?.find((p) => p.Name === title);
    if (match) {
      await fetch(`${base}/Items/${match.Id}`, { method: 'DELETE', headers: { 'X-Emby-Token': apiKey } });
    }
  }

  const itemIds = tmdbIds.map((id) => index.get(id)?.Id).filter((id): id is string => Boolean(id));
  if (itemIds.length === 0) return { ok: true, itemCount: 0 };

  const createRes = await fetch(`${base}/Playlists`, {
    method: 'POST',
    headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Name: title, Ids: itemIds, UserId: userId, MediaType: 'Video' }),
  });
  if (!createRes.ok) return { ok: false, error: `Jellyfin playlist creation failed (${createRes.status})` };

  return { ok: true, itemCount: itemIds.length };
}
