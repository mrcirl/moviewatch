import { getSettings } from '@/lib/settings';

export interface PlexAvailability {
  available: boolean;
  ratingKey?: string;
  webUrl?: string;
}

interface PlexItem {
  ratingKey: string;
}

interface PlexSection {
  key: string;
  type: string;
}

interface PlexMetadataItem {
  ratingKey: string;
  guid?: string;
  Guid?: { id: string }[];
}

// Some write endpoints (e.g. creating a playlist) expect a client identifier
// even though reads don't enforce one; sending it everywhere is harmless.
const PLEX_CLIENT_IDENTIFIER = 'moviewatch';

async function plexFetch<T>(
  base: string,
  token: string,
  path: string,
  params: Record<string, string> = {},
  opts: { method?: string } = {},
): Promise<T> {
  const url = new URL(`${base}${path}`);
  url.searchParams.set('X-Plex-Token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: { Accept: 'application/json', 'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Plex request failed (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Pulls a TMDB id out of either the modern `Guid` array (`tmdb://123`) or a legacy single `guid` (`...themoviedb://123?...`). */
function extractTmdbId(item: PlexMetadataItem): number | null {
  const modern = item.Guid?.find((g) => g.id.startsWith('tmdb://'));
  if (modern) {
    const id = Number(modern.id.slice('tmdb://'.length));
    if (!Number.isNaN(id)) return id;
  }
  const legacy = item.guid ? /themoviedb:\/\/(\d+)/.exec(item.guid) : null;
  if (legacy) {
    const id = Number(legacy[1]);
    if (!Number.isNaN(id)) return id;
  }
  return null;
}

async function fetchMovieIndex(base: string, token: string): Promise<Map<number, PlexItem>> {
  const sections = await plexFetch<{ MediaContainer?: { Directory?: PlexSection[] } }>(base, token, '/library/sections');
  const movieSectionKeys = (sections.MediaContainer?.Directory ?? [])
    .filter((d) => d.type === 'movie')
    .map((d) => d.key);

  const byTmdbId = new Map<number, PlexItem>();
  for (const key of movieSectionKeys) {
    const data = await plexFetch<{ MediaContainer?: { Metadata?: PlexMetadataItem[] } }>(
      base,
      token,
      `/library/sections/${key}/all`,
      { includeGuids: '1' },
    );
    for (const item of data.MediaContainer?.Metadata ?? []) {
      const tmdbId = extractTmdbId(item);
      if (tmdbId !== null) byTmdbId.set(tmdbId, { ratingKey: item.ratingKey });
    }
  }
  return byTmdbId;
}

async function fetchMachineIdentifier(base: string, token: string): Promise<string | null> {
  try {
    const data = await plexFetch<{ MediaContainer?: { machineIdentifier?: string } }>(base, token, '/identity');
    return data.MediaContainer?.machineIdentifier ?? null;
  } catch {
    return null;
  }
}

// Plex has no server-side "filter by external id" query either, so — same
// approach as the Jellyfin integration — pull each movie library section
// once (with Guids) and match TMDB ids client-side. Cached briefly so a
// watchlist page full of cards doesn't re-fetch every section per card.
const CACHE_TTL_MS = 60_000;
let cache: { base: string; byTmdbId: Map<number, PlexItem>; machineIdentifier: string | null; expires: number } | null =
  null;

/**
 * The combined Plex movie library (across all movie-type sections) indexed
 * by TMDB id. Cached for CACHE_TTL_MS; pass `force: true` to bypass the
 * cache and re-fetch immediately. Returns null if Plex isn't configured.
 */
export async function getPlexMovieIndex(opts: { force?: boolean } = {}): Promise<Map<number, PlexItem> | null> {
  const settings = await getSettings();
  if (!settings.plexUrl || !settings.plexToken) return null;

  const base = settings.plexUrl.replace(/\/+$/, '');

  if (opts.force || !cache || cache.base !== base || cache.expires < Date.now()) {
    const [byTmdbId, machineIdentifier] = await Promise.all([
      fetchMovieIndex(base, settings.plexToken),
      fetchMachineIdentifier(base, settings.plexToken),
    ]);
    cache = { base, byTmdbId, machineIdentifier, expires: Date.now() + CACHE_TTL_MS };
  }

  return cache.byTmdbId;
}

/** Looks up a movie in the configured Plex server by its TMDB id. */
export async function checkPlexAvailability(tmdbId: number): Promise<PlexAvailability | null> {
  const settings = await getSettings();
  if (!settings.plexUrl || !settings.plexToken) return null;

  const index = await getPlexMovieIndex();
  const item = index?.get(tmdbId);
  if (!item) return { available: false };

  const machineIdentifier = cache?.machineIdentifier;
  const webUrl = machineIdentifier
    ? `https://app.plex.tv/desktop#!/server/${machineIdentifier}/details?key=${encodeURIComponent(`/library/metadata/${item.ratingKey}`)}`
    : undefined;

  return { available: true, ratingKey: item.ratingKey, webUrl };
}

export type PlaylistSyncResult = { ok: true; itemCount: number } | { ok: false; error: string };

interface PlexPlaylistSummary {
  ratingKey: string;
  title: string;
  playlistType?: string;
}

/**
 * Creates or fully replaces a video playlist titled "MovieWatch: {personName}"
 * containing the given TMDB-id movies (matched against the Plex library —
 * ids with no match in Plex are silently skipped). Resyncing deletes any
 * existing playlist of that name first and recreates it from scratch, since
 * Plex has no clean "replace all items" endpoint.
 */
export async function syncPlexPlaylist(personName: string, tmdbIds: number[]): Promise<PlaylistSyncResult> {
  const settings = await getSettings();
  if (!settings.plexUrl || !settings.plexToken) return { ok: false, error: 'Plex is not configured.' };
  const base = settings.plexUrl.replace(/\/+$/, '');
  const token = settings.plexToken;

  const index = await getPlexMovieIndex();
  if (!index) return { ok: false, error: 'Plex is not configured.' };
  const machineIdentifier = cache?.machineIdentifier;
  if (!machineIdentifier) return { ok: false, error: "Could not determine the Plex server's identity." };

  const title = `MovieWatch: ${personName}`;

  const existing = await plexFetch<{ MediaContainer?: { Metadata?: PlexPlaylistSummary[] } }>(base, token, '/playlists');
  const match = existing.MediaContainer?.Metadata?.find((p) => p.title === title && p.playlistType === 'video');
  if (match) {
    await plexFetch(base, token, `/playlists/${match.ratingKey}`, {}, { method: 'DELETE' });
  }

  const ratingKeys = tmdbIds.map((id) => index.get(id)?.ratingKey).filter((k): k is string => Boolean(k));
  if (ratingKeys.length === 0) return { ok: true, itemCount: 0 };

  const uri = `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${ratingKeys.join(',')}`;
  await plexFetch(base, token, '/playlists', { type: 'video', title, smart: '0', uri }, { method: 'POST' });

  return { ok: true, itemCount: ratingKeys.length };
}
