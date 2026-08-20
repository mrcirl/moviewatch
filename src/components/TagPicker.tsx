'use client';

interface Option {
  id: number;
  name: string;
  color?: string | null;
}

export default function TagPicker({
  options,
  selectedIds,
  onToggle,
  emptyHint,
}: {
  options: Option[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  emptyHint?: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-base-400">{emptyHint ?? 'None available yet.'}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = selectedIds.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`badge border transition-colors ${
              selected
                ? 'border-transparent text-white'
                : 'border-base-700 bg-transparent text-base-400 hover:border-base-600 hover:text-base-200'
            }`}
            style={selected ? { backgroundColor: opt.color ?? '#6c5ce7' } : undefined}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
