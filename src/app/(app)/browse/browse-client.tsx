'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { PersonDTO, WatchlistItemDTO } from '@/lib/types';
import TagPicker from '@/components/TagPicker';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

// Give a beat after the last person is tagged before committing (so picking
// two or three people doesn't yank the card away after the first click),
// then another beat after it's confirmed before it actually leaves the grid.
const TAG_COMMIT_DELAY_MS = 900;
const LEAVE_DELAY_MS = 600;

function letterOf(title: string): string {
  const raw = title.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(raw) ? raw : '#';
}

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
  const [pending, setPending] = useState<Map<number, number[]>>(new Map());
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const pendingRef = useRef<Map<number, number[]>>(new Map());
  const commitTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const leaveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const commits = commitTimers.current;
    const leaves = leaveTimers.current;
    return () => {
      commits.forEach(clearTimeout);
      leaves.forEach(clearTimeout);
    };
  }, []);

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

  // Facet counts: how many items each option would leave you with, given the
  // *other* filter's current value — so switching one filter updates the
  // other's counts instead of always reflecting the unfiltered total.
  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let all = 0;
    for (const item of items) {
      if (ratingFilter !== 'ALL' && item.movie.certification !== ratingFilter) continue;
      all++;
      for (const g of item.movie.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return { counts, all };
  }, [items, ratingFilter]);

  const ratingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let all = 0;
    for (const item of items) {
      if (genreFilter !== 'ALL' && !item.movie.genres.includes(genreFilter)) continue;
      all++;
      if (item.movie.certification) counts.set(item.movie.certification, (counts.get(item.movie.certification) ?? 0) + 1);
    }
    return { counts, all };
  }, [items, genreFilter]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (genreFilter !== 'ALL' && !item.movie.genres.includes(genreFilter)) return false;
      if (ratingFilter !== 'ALL' && item.movie.certification !== ratingFilter) return false;
      return true;
    });
  }, [items, genreFilter, ratingFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, WatchlistItemDTO[]>();
    for (const item of filtered) {
      const letter = letterOf(item.movie.title);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(item);
    }
    return map;
  }, [filtered]);

  function scrollToLetter(letter: string) {
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function togglePerson(id: number, personId: number) {
    const current = pendingRef.current.get(id) ?? [];
    const next = current.includes(personId) ? current.filter((p) => p !== personId) : [...current, personId];
    const map = new Map(pendingRef.current);
    map.set(id, next);
    pendingRef.current = map;
    setPending(map);

    const existing = commitTimers.current.get(id);
    if (existing) clearTimeout(existing);
    commitTimers.current.set(
      id,
      setTimeout(() => commitTagging(id), TAG_COMMIT_DELAY_MS),
    );
  }

  async function commitTagging(id: number) {
    commitTimers.current.delete(id);
    const personIds = pendingRef.current.get(id) ?? [];
    if (personIds.length === 0) return;

    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds }),
    });
    if (!res.ok) return;
    const { item } = await res.json();

    // Tagging with anyone graduates it onto the main watchlist — fade it out
    // before it actually drops out of here, rather than yanking it away.
    if (item.people.length > 0) {
      setLeaving((prev) => new Set(prev).add(id));
      leaveTimers.current.set(
        id,
        setTimeout(() => {
          leaveTimers.current.delete(id);
          setItems((prev) => prev.filter((i) => i.id !== id));
        }, LEAVE_DELAY_MS),
      );
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    }
  }

  async function discard(id: number) {
    if (!confirm('Discard this film? It will be removed entirely — you can re-import it later.')) return;
    const commitTimer = commitTimers.current.get(id);
    if (commitTimer) clearTimeout(commitTimer);
    commitTimers.current.delete(id);
    const leaveTimer = leaveTimers.current.get(id);
    if (leaveTimer) clearTimeout(leaveTimer);
    leaveTimers.current.delete(id);
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
        <FilterGroup
          label="Genre"
          value={genreFilter}
          onChange={setGenreFilter}
          options={genres}
          counts={genreCounts.counts}
          allCount={genreCounts.all}
        />
        <FilterGroup
          label="Rating"
          value={ratingFilter}
          onChange={setRatingFilter}
          options={ratings}
          counts={ratingCounts.counts}
          allCount={ratingCounts.all}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-base-400">No films match those filters.</p>
      ) : (
        <>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:hidden" aria-label="Jump to letter">
            {LETTERS.map((letter) => {
              const has = groups.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!has}
                  onClick={() => scrollToLetter(letter)}
                  className={`flex-shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                    has ? 'bg-base-900 text-accent-400' : 'text-base-800'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-6">
              {LETTERS.filter((letter) => groups.has(letter)).map((letter) => (
              <section key={letter} id={`letter-${letter}`} className="scroll-mt-20 space-y-2">
                <h2 className="text-sm font-semibold text-base-400">{letter}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {groups.get(letter)!.map((item) => (
                    <div
                      key={item.id}
                      className={`card space-y-2 p-3 transition-opacity duration-500 ${
                        leaving.has(item.id) ? 'pointer-events-none opacity-0' : 'opacity-100'
                      }`}
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-base-800">
                        {item.movie.posterPath ? (
                          <Image
                            src={item.movie.posterPath}
                            alt={item.movie.title}
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
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
                        selectedIds={pending.get(item.id) ?? []}
                        onToggle={(personId) => togglePerson(item.id, personId)}
                        emptyHint="Add people on the People page."
                      />
                      <button onClick={() => discard(item.id)} className="btn-danger w-full text-xs">
                        Discard
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <nav className="sticky top-20 hidden flex-shrink-0 flex-col items-center gap-0.5 sm:flex" aria-label="Jump to letter">
            {LETTERS.map((letter) => {
              const has = groups.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!has}
                  onClick={() => scrollToLetter(letter)}
                  className={`w-4 text-center text-[10px] font-semibold leading-tight ${
                    has ? 'text-accent-400 hover:text-accent-300' : 'text-base-800'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </nav>
          </div>
        </>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
  counts,
  allCount,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  counts: Map<string, number>;
  allCount: number;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-base-900 p-1">
      <span className="px-2 text-xs font-medium uppercase tracking-wide text-base-500">{label}</span>
      <button
        onClick={() => onChange('ALL')}
        className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
          value === 'ALL' ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200'
        }`}
      >
        All <span className="text-xs opacity-70">({allCount})</span>
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={!counts.get(opt)}
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
            value === opt ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200 disabled:opacity-40'
          }`}
        >
          {opt} <span className="text-xs opacity-70">({counts.get(opt) ?? 0})</span>
        </button>
      ))}
    </div>
  );
}
