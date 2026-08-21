'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [placeFilter, setPlaceFilter] = useState<number | 'ALL'>('ALL');
  const [pickId, setPickId] = useState<number | null>(null);

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
      if (placeFilter !== 'ALL' && !item.places.some((p) => p.place.id === placeFilter)) return false;
      return true;
    });
  }, [items, statusFilter, personFilter, placeFilter]);

  // Independent of the status tab above — picking only ever draws from what
  // you haven't watched yet, but still honors whichever person/place you've
  // filtered to.
  const pickPool = useMemo(() => {
    return items.filter((item) => {
      if (item.status !== 'WANT_TO_WATCH') return false;
      if (personFilter !== 'ALL' && !item.people.some((p) => p.person.id === personFilter)) return false;
      if (placeFilter !== 'ALL' && !item.places.some((p) => p.place.id === placeFilter)) return false;
      return true;
    });
  }, [items, personFilter, placeFilter]);

  function pickRandom() {
    if (pickPool.length === 0) return;
    const options = pickPool.length > 1 ? pickPool.filter((i) => i.id !== pickId) : pickPool;
    setPickId(options[Math.floor(Math.random() * options.length)].id);
  }

  const pickedItem = pickId !== null ? (items.find((i) => i.id === pickId) ?? null) : null;

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
          <button
            onClick={pickRandom}
            disabled={pickPool.length === 0}
            className="btn-secondary"
            title={pickPool.length === 0 ? 'Nothing in "want to watch" matches your filters' : undefined}
          >
            🎲 What should we watch?
          </button>
          <Link href="/search" className="btn-primary">
            + Add a film
          </Link>
        </div>
      </div>

      {people.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-base-400">Watch with</span>
          <button
            onClick={() => setPersonFilter('ALL')}
            className={`badge border transition-colors ${
              personFilter === 'ALL'
                ? 'border-transparent bg-accent-500 text-white'
                : 'border-base-700 bg-transparent text-base-400 hover:border-base-600 hover:text-base-200'
            }`}
          >
            Everyone
          </button>
          {people.map((p) => {
            const selected = personFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPersonFilter(selected ? 'ALL' : p.id)}
                className={`badge border transition-colors ${
                  selected
                    ? 'border-transparent text-white'
                    : 'border-base-700 bg-transparent text-base-400 hover:border-base-600 hover:text-base-200'
                }`}
                style={selected ? { backgroundColor: p.color ?? '#6c5ce7' } : undefined}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {places.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-base-400">Where</span>
          <button
            onClick={() => setPlaceFilter('ALL')}
            className={`badge border transition-colors ${
              placeFilter === 'ALL'
                ? 'border-transparent bg-accent-500 text-white'
                : 'border-base-700 bg-transparent text-base-400 hover:border-base-600 hover:text-base-200'
            }`}
          >
            Anywhere
          </button>
          {places.map((pl) => {
            const selected = placeFilter === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => setPlaceFilter(selected ? 'ALL' : pl.id)}
                className={`badge border transition-colors ${
                  selected
                    ? 'border-transparent bg-accent-500 text-white'
                    : 'border-base-700 bg-transparent text-base-400 hover:border-base-600 hover:text-base-200'
                }`}
              >
                {pl.name}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-base-400">
          <p className="mb-3">
            {personFilter === 'ALL' && placeFilter === 'ALL' ? 'Nothing here yet.' : 'Nothing matches these filters yet.'}
          </p>
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

      {pickedItem && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPickId(null)}
        >
          <div className="card w-full max-w-sm space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-base-400">Tonight&apos;s pick</p>
              <button onClick={() => setPickId(null)} className="text-base-400 hover:text-base-200" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="flex gap-4">
              <div className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-base-800">
                {pickedItem.movie.posterPath ? (
                  <Image src={pickedItem.movie.posterPath} alt={pickedItem.movie.title} fill sizes="112px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🎬</div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-base-200">
                  {pickedItem.movie.title}{' '}
                  {pickedItem.movie.year && <span className="text-base-400">({pickedItem.movie.year})</span>}
                </p>
                {pickedItem.movie.runtime && <p className="text-xs text-base-400">{pickedItem.movie.runtime} min</p>}
                {pickedItem.people.length > 0 && (
                  <p className="text-xs text-base-400">With {pickedItem.people.map((p) => p.person.name).join(', ')}</p>
                )}
                {pickedItem.places.length > 0 && (
                  <p className="text-xs text-base-400">At {pickedItem.places.map((p) => p.place.name).join(', ')}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={pickRandom} className="btn-secondary flex-1" disabled={pickPool.length <= 1}>
                🎲 Pick again
              </button>
              <button
                onClick={async () => {
                  await updateItem(pickedItem.id, { status: 'WATCHED' });
                  setPickId(null);
                }}
                className="btn-primary flex-1"
              >
                ✓ Mark watched
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
