import { prisma } from '@/lib/db';
import { serializeWatchlistItem, serializePerson, serializePlace } from '@/lib/serialize';
import { mainWatchlistWhere } from '@/lib/watchlist';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const [items, people, places] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: mainWatchlistWhere,
      include: {
        movie: true,
        people: { include: { person: true } },
        places: { include: { place: true } },
      },
      orderBy: [{ status: 'asc' }, { addedAt: 'desc' }],
    }),
    prisma.person.findMany({ orderBy: { name: 'asc' } }),
    prisma.place.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <DashboardClient
      initialItems={items.map(serializeWatchlistItem)}
      people={people.map(serializePerson)}
      places={places.map(serializePlace)}
    />
  );
}
