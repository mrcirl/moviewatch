'use client';

import { useEffect, useRef, useState } from 'react';
import { applyTheme, DEFAULT_MODE, DEFAULT_STYLE, loadTheme, saveTheme, STYLES, type Mode, type StyleId } from '@/lib/theme';

export default function ThemePicker() {
  const [style, setStyle] = useState<StyleId>(DEFAULT_STYLE);
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The bootstrap script (see layout.tsx) already applied the real saved
  // theme before paint; this just syncs the picker's own displayed state to
  // it post-mount, since reading localStorage during the initial render
  // would mismatch the server-rendered defaults.
  useEffect(() => {
    const saved = loadTheme();
    setStyle(saved.style);
    setMode(saved.mode);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function choose(nextStyle: StyleId, nextMode: Mode) {
    setStyle(nextStyle);
    setMode(nextMode);
    applyTheme(nextStyle, nextMode);
    saveTheme(nextStyle, nextMode);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-base-300 hover:bg-base-800"
        aria-label="Theme settings"
        aria-expanded={open}
      >
        {mode === 'dark' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12.5A8.5 8.5 0 0111.5 3 8.5 8.5 0 1021 12.5z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 space-y-3 rounded-xl border border-base-800 bg-base-900 p-3 shadow-lg">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-base-400">Style</p>
            <div className="space-y-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => choose(s.id, mode)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    style === s.id ? 'bg-base-800 text-base-200' : 'text-base-400 hover:bg-base-800 hover:text-base-200'
                  }`}
                >
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.swatch }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-base-400">Mode</p>
            <div className="flex items-center gap-1 rounded-lg bg-base-800 p-1">
              {(['dark', 'light'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => choose(style, m)}
                  className={`flex-1 rounded-md px-2.5 py-1 text-sm font-medium capitalize transition-colors ${
                    mode === m ? 'bg-accent-500 text-white' : 'text-base-400 hover:text-base-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
