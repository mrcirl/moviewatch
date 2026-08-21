'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { PersonDTO, WatchlistItemDTO } from '@/lib/types';
import TagPicker from '@/components/TagPicker';

export default function BrowseClient({
  initialItems,
  people,
}: {
  initialItems: WatchlistItemDTO[];
  people: PersonDTO[];
}) {
  const [items, setItems] = useState(initialItems);
  const [genreFilter, setGenreFilter] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const g of item.movie.genres) set.add(g);
    return [...set].sort();
  }, [items]);

  const ratings = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) if (item.movie.certification) set.add(item.movie.certification);
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (genreFilter !== 'ALL' && !item.movie.genres.includes(genreFilter)) return false;
      if (ratingFilter !== 'ALL' && item.movie.certification !== ratingFilter) return false;
      return true;
    });
  }, [items, genreFilter, ratingFilter]);

  async function tagPerson(id: number, personIds: number[]) {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds }),
    });
    if (!res.ok) return;
    const { item } = await res.json();
    // Tagging with anyone graduates it onto the main watchlist, so it drops out of here.
    if (item.people.length > 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    }
  }

  async function discard(id: number) {
    if (!confirm('Discard this film? It will be removed entirely — you can re-import it later.')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-base-400">
        Nothing here yet. Import your Jellyfin or Plex library from Settings — anything not already tagged with a
        person shows up here to browse and tag.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <FilterGroup label="Genre" value={genreFilter} onChange={setGenreFilter} options={genres} />
        <FilterGroup label="Rating" value={ratingFilter} onChange={setRatingFilter} options={ratings} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-base-400">No films match those filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.id} className="card space-y-2 p-3">
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-base-800">
                {item.movie.posterPath ? (
                  <Image src={item.movie.posterPath} alt={item.movie.title} fill sizes="200px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🎬</div>
                )}
              </div>
              <div>
                <p className="line-clamp-2 text-sm font-medium leading-tight text-base-200">
                  {item.movie.title} {item.movie.year && <span className="text-base-500">({item.movie.year})</span>}
                </p>
                {item.movie.certification && (
                  <span className="mt-1 inline-block rounded border border-base-600 px-1 text-[10px] font-medium leading-tight text-base-300">
                    {item.movie.certification}
                  </span>
                )}
              </div>
              <TagPicker
                options={people}
                selectedIds={[]}
                onToggle={(personId) => tagPerson(item.id, [personId])}
                emptyHint="Add people on the People page."
              />
              <button onClick={() => discard(item.id)} className="btn-danger w-full text-xs">
                Discard
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-1 rounded-lg bg-base-900 p-1">
      <span className="px-2 text-xs font-medium uppercase tracking-wide text-base-500">{label}</span>
      {['ALL', ...options].map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
            value === opt ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200'
          }`}
        >
          {opt === 'ALL' ? 'All' : opt}
        </button>
      ))}
    </div>
  );
}
