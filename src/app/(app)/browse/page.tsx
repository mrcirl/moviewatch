import { prisma } from '@/lib/db';
import { serializeWatchlistItem, serializePerson } from '@/lib/serialize';
import { browseAvailableWhere } from '@/lib/watchlist';
import BrowseClient from './browse-client';

export default async function BrowsePage() {
  const [items, people] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: browseAvailableWhere,
      include: {
        movie: true,
        people: { include: { person: true } },
        places: { include: { place: true } },
      },
      orderBy: { movie: { title: 'asc' } },
    }),
    prisma.person.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-base-200">Browse available</h1>
        <p className="text-sm text-base-400">
          Films pulled in from your Jellyfin/Plex library import. Tag who&apos;s watching to add one to your
          watchlist — untagged films stay here.
        </p>
      </div>
      <BrowseClient initialItems={items.map(serializeWatchlistItem)} people={people.map(serializePerson)} />
    </div>
  );
}
