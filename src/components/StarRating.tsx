'use client';

export default function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange(value === n ? null : n)}
            className={`text-base leading-none transition-colors ${
              filled ? 'text-yellow-400' : 'text-base-600 hover:text-yellow-400/60'
            }`}
          >
            {filled ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
