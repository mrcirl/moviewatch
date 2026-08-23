import { prisma } from '@/lib/db';
import { checkJellyfinAvailability } from '@/lib/jellyfin';
import { checkPlexAvailability } from '@/lib/plex';
import { getSeerrStatus, MEDIA_STATUS_LABEL } from '@/lib/seerr';
import { getWatchProviders } from '@/lib/tmdb';
import { mainWatchlistWhere } from '@/lib/watchlist';

export interface AvailabilityData {
  jellyfin: unknown;
  plex: unknown;
  seerr: unknown;
  streaming: unknown;
}

/** Hits Jellyfin/Plex/Seerr/TMDB live for one film. Slow — only called by the refresh job or as a fallback for a film that's never been checked yet. */
export async function computeAvailability(tmdbId: number): Promise<AvailabilityData> {
  const [jellyfin, plex, seerr, streaming] = await Promise.allSettled([
    checkJellyfinAvailability(tmdbId),
    checkPlexAvailability(tmdbId),
    getSeerrStatus(tmdbId),
    getWatchProviders(tmdbId),
  ]);

  return {
    jellyfin: jellyfin.status === 'fulfilled' ? jellyfin.value : { error: jellyfin.reason?.message },
    plex: plex.status === 'fulfilled' ? plex.value : { error: plex.reason?.message },
    seerr:
      seerr.status === 'fulfilled'
        ? seerr.value && {
            ...seerr.value,
            statusLabel: seerr.value.mediaInfo ? MEDIA_STATUS_LABEL[seerr.value.mediaInfo.status] : null,
          }
        : { error: seerr.reason?.message },
    streaming: streaming.status === 'fulfilled' ? streaming.value : { error: streaming.reason?.message },
  };
}

export async function refreshMovieAvailability(movieId: number, tmdbId: number): Promise<AvailabilityData> {
  const data = await computeAvailability(tmdbId);
  await prisma.movie.update({
    where: { id: movieId },
    data: { availabilityJson: JSON.stringify(data), availabilityCheckedAt: new Date() },
  });
  return data;
}

/**
 * Refreshes cached availability for every film currently on the main
 * watchlist (the only place the availability panel is shown). Run
 * periodically by server.js rather than per-page-load, since a live check
 * means one Seerr and one TMDB round trip per film. Sequential, not
 * parallel — Jellyfin/Plex/Seerr are self-hosted services on the same LAN
 * as this app and don't need to be hammered with concurrent requests.
 */
export async function refreshAllAvailability(): Promise<{ checked: number; failed: number }> {
  const items = await prisma.watchlistItem.findMany({
    where: mainWatchlistWhere,
    select: { movie: { select: { id: true, tmdbId: true } } },
  });
  const movies = new Map(items.map((i) => [i.movie.id, i.movie]));

  let checked = 0;
  let failed = 0;
  for (const movie of movies.values()) {
    try {
      await refreshMovieAvailability(movie.id, movie.tmdbId);
      checked++;
    } catch {
      failed++;
    }
  }
  return { checked, failed };
}
