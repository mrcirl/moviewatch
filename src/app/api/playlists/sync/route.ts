import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { syncPlexPlaylist, type PlaylistSyncResult } from '@/lib/plex';
import { syncJellyfinPlaylist } from '@/lib/jellyfin';

/**
 * Creates/replaces one "want to watch" playlist per person, on whichever of
 * Plex/Jellyfin is configured, named "MovieWatch: {person}".
 */
export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const settings = await getSettings();
  const plexConfigured = Boolean(settings.plexUrl && settings.plexToken);
  const jellyfinConfigured = Boolean(settings.jellyfinUrl && settings.jellyfinApiKey);

  if (!plexConfigured && !jellyfinConfigured) {
    return NextResponse.json({ error: 'Configure Plex or Jellyfin in Settings first.' }, { status: 412 });
  }

  const people = await prisma.person.findMany({
    orderBy: { name: 'asc' },
    include: {
      items: {
        where: { watchlistItem: { status: 'WANT_TO_WATCH' } },
        include: { watchlistItem: { include: { movie: true } } },
      },
    },
  });

  const results = await Promise.all(
    people.map(async (person) => {
      const tmdbIds = person.items.map((i) => i.watchlistItem.movie.tmdbId);
      const [plex, jellyfin]: [PlaylistSyncResult | null, PlaylistSyncResult | null] = await Promise.all([
        plexConfigured ? syncPlexPlaylist(person.name, tmdbIds) : Promise.resolve(null),
        jellyfinConfigured ? syncJellyfinPlaylist(person.name, tmdbIds) : Promise.resolve(null),
      ]);
      return { person: person.name, filmCount: tmdbIds.length, plex, jellyfin };
    }),
  );

  return NextResponse.json({ results });
}
