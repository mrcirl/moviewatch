import { useId } from 'react';

/**
 * The mark: a synthwave sun banded by a horizon, over a receding grid —
 * badged like a video-store shelf-tag. One asset, reused at nav size and
 * scaled up for the login/setup screens.
 */
export default function Logo({
  variant = 'lockup',
  size = 28,
  className = '',
}: {
  variant?: 'mark' | 'lockup';
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sunGrad = `logo-sun-${uid}`;
  const gridGrad = `logo-grid-${uid}`;
  const clipId = `logo-clip-${uid}`;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={variant === 'mark' ? 'img' : undefined}
        aria-hidden={variant === 'lockup' ? true : undefined}
      >
        {variant === 'mark' && <title>MovieWatch</title>}
        <defs>
          <linearGradient id={sunGrad} x1="6" y1="8" x2="26" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff8a3d" />
            <stop offset="0.55" stopColor="#ff3d81" />
            <stop offset="1" stopColor="#7c4dff" />
          </linearGradient>
          <linearGradient id={gridGrad} x1="0" y1="18" x2="32" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#37e6e6" />
            <stop offset="1" stopColor="#7c4dff" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="4" y="6" width="24" height="12" />
          </clipPath>
        </defs>
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" fill="#0b0d12" stroke="#242b38" strokeWidth="1.5" />
        <g clipPath={`url(#${clipId})`}>
          <circle cx="16" cy="17" r="9" fill={`url(#${sunGrad})`} />
          <rect x="4" y="12.1" width="24" height="1.5" fill="#0b0d12" />
          <rect x="4" y="15.3" width="24" height="1.5" fill="#0b0d12" />
        </g>
        <line x1="3" y1="18" x2="29" y2="18" stroke={`url(#${gridGrad})`} strokeWidth="1.6" strokeLinecap="round" />
        <g stroke={`url(#${gridGrad})`} strokeWidth="1" opacity="0.85">
          <line x1="16" y1="18" x2="6" y2="27" />
          <line x1="16" y1="18" x2="11" y2="27" />
          <line x1="16" y1="18" x2="16" y2="27" />
          <line x1="16" y1="18" x2="21" y2="27" />
          <line x1="16" y1="18" x2="26" y2="27" />
          <line x1="8.3" y1="21.5" x2="23.7" y2="21.5" />
          <line x1="6.8" y1="24.3" x2="25.2" y2="24.3" />
        </g>
      </svg>
      {variant === 'lockup' && (
        <span
          className="bg-gradient-to-r from-brand-violet via-brand-magenta to-brand-orange bg-clip-text font-display tracking-wide text-transparent"
          style={{ fontSize: size * 0.6 }}
        >
          MovieWatch
        </span>
      )}
    </span>
  );
}
