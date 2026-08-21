'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface SearchResult {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
  inWatchlist: boolean;
}

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Search failed.');
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.results);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function addToWatchlist(tmdbId: number) {
    setAddingId(tmdbId);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId }),
    });
    setAddingId(null);
    if (res.ok) {
      setResults((prev) => prev.map((r) => (r.tmdbId === tmdbId ? { ...r, inWatchlist: true } : r)));
    }
  }

  return (
    <div className="space-y-6">
      <input
        className="input"
        placeholder="Search movies by title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-base-400">Searching…</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {results.map((r) => (
          <div key={r.tmdbId} className="card flex flex-col overflow-hidden">
            <div className="relative aspect-[2/3] w-full bg-base-800">
              {r.posterUrl ? (
                <Image src={r.posterUrl} alt={r.title} fill sizes="200px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">🎬</div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="text-sm font-medium text-base-200">
                {r.title} {r.year && <span className="text-base-400">({r.year})</span>}
              </p>
              <button
                onClick={() => addToWatchlist(r.tmdbId)}
                disabled={r.inWatchlist || addingId === r.tmdbId}
                className={r.inWatchlist ? 'btn-secondary mt-auto text-xs' : 'btn-primary mt-auto text-xs'}
              >
                {r.inWatchlist ? '✓ In watchlist' : addingId === r.tmdbId ? 'Adding…' : '+ Add to watchlist'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
