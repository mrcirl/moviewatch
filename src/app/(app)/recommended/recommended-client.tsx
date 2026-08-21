'use client';

import { useState } from 'react';
import Image from 'next/image';

interface RecommendedMovie {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  voteAverage: number;
}

export interface RecommendedRow {
  genreId: number;
  genreName: string;
  movies: RecommendedMovie[];
}

export default function RecommendedClient({ rows }: { rows: RecommendedRow[] }) {
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  async function addToWatchlist(tmdbId: number) {
    setAddingId(tmdbId);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId }),
    });
    setAddingId(null);
    if (res.ok) setAddedIds((prev) => new Set(prev).add(tmdbId));
  }

  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <div key={row.genreId} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-300">{row.genreName}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {row.movies.map((m) => {
              const added = addedIds.has(m.tmdbId);
              return (
                <div key={m.tmdbId} className="card w-32 flex-shrink-0 overflow-hidden">
                  <div className="relative aspect-[2/3] w-full bg-base-800">
                    {m.posterUrl ? (
                      <Image src={m.posterUrl} alt={m.title} fill sizes="128px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🎬</div>
                    )}
                    <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                      ★ {m.voteAverage.toFixed(1)}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-2">
                    <p className="line-clamp-2 text-xs font-medium leading-tight text-base-200">
                      {m.title} {m.year && <span className="text-base-500">({m.year})</span>}
                    </p>
                    <button
                      onClick={() => addToWatchlist(m.tmdbId)}
                      disabled={added || addingId === m.tmdbId}
                      className={`w-full text-[11px] ${added ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {added ? '✓ Added' : addingId === m.tmdbId ? 'Adding…' : '+ Add'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
