import type { Prisma } from '@prisma/client';

/**
 * Bulk library imports (Jellyfin/Plex) land here first rather than the main
 * watchlist, since importing pulls in the entire library rather than an
 * explicit "I want this" pick. An item graduates to the main watchlist as
 * soon as it's tagged with at least one person.
 */
export const mainWatchlistWhere: Prisma.WatchlistItemWhereInput = {
  NOT: { imported: true, people: { none: {} } },
};

export const browseAvailableWhere: Prisma.WatchlistItemWhereInput = {
  imported: true,
  people: { none: {} },
};
