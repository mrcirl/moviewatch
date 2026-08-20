import { prisma } from '@/lib/db';
import { serializePerson } from '@/lib/serialize';
import PeopleClient from './people-client';

export default async function PeoplePage() {
  const people = await prisma.person.findMany({ orderBy: { name: 'asc' } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-base-200">People</h1>
        <p className="text-sm text-base-400">The people you like to watch films with. Tag them on any watchlist entry.</p>
      </div>
      <PeopleClient initialPeople={people.map(serializePerson)} />
    </div>
  );
}
