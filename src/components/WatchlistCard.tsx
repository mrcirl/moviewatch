'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PersonDTO, PlaceDTO, WatchlistItemDTO } from '@/lib/types';
import TagPicker from './TagPicker';
import AvailabilityPanel from './AvailabilityPanel';
import StarRating from './StarRating';

export default function WatchlistCard({
  item,
  people,
  places,
  onUpdate,
  onDelete,
}: {
  item: WatchlistItemDTO;
  people: PersonDTO[];
  places: PlaceDTO[];
  onUpdate: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const watched = item.status === 'WATCHED';
  const personIds = item.people.map((p) => p.person.id);
  const placeIds = item.places.map((p) => p.place.id);

  async function toggleWatched() {
    await onUpdate(item.id, { status: watched ? 'WANT_TO_WATCH' : 'WATCHED' });
  }

  async function saveNotes() {
    if (notes === (item.notes ?? '')) return;
    setSavingNotes(true);
    await onUpdate(item.id, { notes: notes.trim() || null });
    setSavingNotes(false);
  }

  async function togglePerson(id: number) {
    const next = personIds.includes(id) ? personIds.filter((p) => p !== id) : [...personIds, id];
    await onUpdate(item.id, { personIds: next });
  }

  async function togglePlace(id: number) {
    const next = placeIds.includes(id) ? placeIds.filter((p) => p !== id) : [...placeIds, id];
    await onUpdate(item.id, { placeIds: next });
  }

  async function setRating(rating: number | null) {
    await onUpdate(item.id, { rating });
  }

  return (
    <div className="card flex gap-4 p-4">
      <div className="relative h-36 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-base-800">
        {item.movie.posterPath ? (
          <Image
            src={item.movie.posterPath}
            alt={item.movie.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">🎬</div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-2 font-semibold text-base-200">
              <span>
                {item.movie.title} {item.movie.year && <span className="text-base-400">({item.movie.year})</span>}
              </span>
              {item.movie.certification && (
                <span className="rounded border border-base-600 px-1 text-[10px] font-medium leading-tight text-base-300">
                  {item.movie.certification}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {item.movie.runtime && <p className="text-xs text-base-400">{item.movie.runtime} min</p>}
              {item.movie.trailerUrl && (
                <a
                  href={item.movie.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent-400 hover:underline"
                >
                  ▶ Trailer
                </a>
              )}
            </div>
            {watched && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <StarRating value={item.rating} onChange={setRating} />
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button onClick={toggleWatched} className={watched ? 'btn-secondary text-xs' : 'btn-primary text-xs'}>
              {watched ? '↩ Watch again' : '✓ Mark watched'}
            </button>
            <button onClick={() => onDelete(item.id)} className="btn-danger text-xs" aria-label="Remove">
              Remove
            </button>
          </div>
        </div>

        <AvailabilityPanel tmdbId={item.movie.tmdbId} />

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-base-400">Watch with</p>
          <TagPicker options={people} selectedIds={personIds} onToggle={togglePerson} emptyHint="Add people on the People page." />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-base-400">Where</p>
          <TagPicker options={places} selectedIds={placeIds} onToggle={togglePlace} emptyHint="Add places on the Places page." />
        </div>

        <textarea
          className="input text-xs"
          rows={1}
          placeholder="Notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={savingNotes}
        />
      </div>
    </div>
  );
}
