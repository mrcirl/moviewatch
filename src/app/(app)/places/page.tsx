import { prisma } from '@/lib/db';
import { serializePlace } from '@/lib/serialize';
import PlacesClient from './places-client';

export default async function PlacesPage() {
  const places = await prisma.place.findMany({ orderBy: { name: 'asc' } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-base-200">Places</h1>
        <p className="text-sm text-base-400">
          Physical spots to watch a film — a couch, a local cinema, a friend&apos;s place. Tag them on any watchlist entry.
        </p>
      </div>
      <PlacesClient initialPlaces={places.map(serializePlace)} />
    </div>
  );
}
