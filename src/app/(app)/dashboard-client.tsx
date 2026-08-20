'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PersonDTO, PlaceDTO, WatchlistItemDTO } from '@/lib/types';
import WatchlistCard from '@/components/WatchlistCard';

type StatusFilter = 'ALL' | 'WANT_TO_WATCH' | 'WATCHED';

export default function DashboardClient({
  initialItems,
  people,
  places,
}: {
  initialItems: WatchlistItemDTO[];
  people: PersonDTO[];
  places: PlaceDTO[];
}) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('WANT_TO_WATCH');
  const [personFilter, setPersonFilter] = useState<number | 'ALL'>('ALL');

  async function updateItem(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    }
  }

  async function deleteItem(id: number) {
    if (!confirm('Remove this from your watchlist?')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (personFilter !== 'ALL' && !item.people.some((p) => p.person.id === personFilter)) return false;
      return true;
    });
  }, [items, statusFilter, personFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-base-900 p-1">
          {(
            [
              ['WANT_TO_WATCH', 'Want to watch'],
              ['WATCHED', 'Watched'],
              ['ALL', 'All'],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === value ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {people.length > 0 && (
            <select
              className="input w-auto"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            >
              <option value="ALL">Everyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/search" className="btn-primary">
            + Add a film
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-base-400">
          <p className="mb-3">Nothing here yet.</p>
          <Link href="/search" className="btn-primary inline-flex">
            Search for a film
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <WatchlistCard key={item.id} item={item} people={people} places={places} onUpdate={updateItem} onDelete={deleteItem} />
          ))}
        </div>
      )}
    </div>
  );
}
