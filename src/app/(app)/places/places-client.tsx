'use client';

import { useState } from 'react';
import type { PlaceDTO } from '@/lib/types';

export default function PlacesClient({ initialPlaces }: { initialPlaces: PlaceDTO[] }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function addPlace(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notes: notes || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not add place.');
      return;
    }
    setPlaces((prev) => [...prev, data.place].sort((a, b) => a.name.localeCompare(b.name)));
    setName('');
    setNotes('');
  }

  async function removePlace(id: number) {
    if (!confirm('Remove this place?')) return;
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/places/${id}`, { method: 'DELETE' });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addPlace} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium text-base-200">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Living room" />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium text-base-200">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. has the good projector" />
        </div>
        <button type="submit" className="btn-primary">
          + Add place
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {places.map((p) => (
          <div key={p.id} className="card flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-base-200">{p.name}</p>
              {p.notes && <p className="text-xs text-base-400">{p.notes}</p>}
            </div>
            <button onClick={() => removePlace(p.id)} className="btn-danger text-xs">
              Remove
            </button>
          </div>
        ))}
        {places.length === 0 && <p className="text-sm text-base-400">No places added yet.</p>}
      </div>
    </div>
  );
}
