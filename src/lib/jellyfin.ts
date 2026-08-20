import { getSettings } from '@/lib/settings';

export interface JellyfinAvailability {
  available: boolean;
  itemId?: string;
  webUrl?: string;
}

/** Looks up a movie in the configured Jellyfin server by its TMDB provider id. */
export async function checkJellyfinAvailability(tmdbId: number): Promise<JellyfinAvailability | null> {
  const settings = await getSettings();
  if (!settings.jellyfinUrl || !settings.jellyfinApiKey) return null;

  const base = settings.jellyfinUrl.replace(/\/+$/, '');
  const url = new URL(`${base}/Items`);
  url.searchParams.set('Recursive', 'true');
  url.searchParams.set('IncludeItemTypes', 'Movie');
  url.searchParams.set('AnyProviderIdEquals', `Tmdb.${tmdbId}`);
  url.searchParams.set('Fields', 'ProviderIds');

  const res = await fetch(url.toString(), {
    headers: { 'X-Emby-Token': settings.jellyfinApiKey },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Jellyfin request failed (${res.status})`);
  }
  const data = (await res.json()) as { Items?: { Id: string }[] };
  const item = data.Items?.[0];
  if (!item) return { available: false };
  return {
    available: true,
    itemId: item.Id,
    webUrl: `${base}/web/index.html#/details?id=${item.Id}`,
  };
}
