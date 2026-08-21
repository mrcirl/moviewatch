'use client';

import { useState } from 'react';
import type { PersonWithFilmsDTO } from '@/lib/types';

const COLORS = ['#6c5ce7', '#e17055', '#00b894', '#0984e3', '#fdcb6e', '#e84393', '#00cec9', '#636e72'];

export default function PeopleClient({ initialPeople }: { initialPeople: PersonWithFilmsDTO[] }) {
  const [people, setPeople] = useState(initialPeople);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not add person.');
      return;
    }
    const person: PersonWithFilmsDTO = { ...data.person, films: [] };
    setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
    setName('');
  }

  async function removePerson(id: number) {
    if (!confirm('Remove this person? They will be untagged from any films.')) return;
    setPeople((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/people/${id}`, { method: 'DELETE' });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addPerson} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium text-base-200">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-base-200">Color</label>
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-base-900 ring-white' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary">
          + Add person
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {people.map((p) => (
          <div key={p.id} className="card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="badge gap-2 border border-base-700 text-base-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? '#6c5ce7' }} />
                {p.name}
              </div>
              <button
                onClick={() => removePerson(p.id)}
                className="text-xs text-base-400 hover:text-red-400"
                aria-label={`Remove ${p.name}`}
              >
                Remove
              </button>
            </div>

            {p.films.length === 0 ? (
              <p className="text-xs text-base-400">Not tagged on anything yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {p.films.map((f) => (
                  <span
                    key={f.watchlistItemId}
                    className={`badge border border-base-700 text-xs ${
                      f.watched ? 'text-base-500 line-through' : 'text-base-300'
                    }`}
                    title={f.watched ? 'Watched by them' : 'Not watched by them yet'}
                  >
                    {f.watched && '✓ '}
                    {f.movie.title}
                    {f.movie.year && ` (${f.movie.year})`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {people.length === 0 && <p className="text-sm text-base-400">No one added yet.</p>}
      </div>
    </div>
  );
}
