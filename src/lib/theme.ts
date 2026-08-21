export const STYLES = [
  { id: 'synthwave', name: 'Synthwave', swatch: '#6c5ce7' },
  { id: 'classic', name: 'Classic', swatch: '#3b82f6' },
  { id: 'cinema', name: 'Cinema', swatch: '#d4a017' },
] as const;

export type StyleId = (typeof STYLES)[number]['id'];
export type Mode = 'light' | 'dark';

export const DEFAULT_STYLE: StyleId = 'synthwave';
export const DEFAULT_MODE: Mode = 'dark';

const STORAGE_KEY = 'mw-theme';

function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && STYLES.some((s) => s.id === value);
}

/** Inlined into a <script> tag in the root layout so the theme applies before first paint. */
export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var style = ${JSON.stringify(DEFAULT_STYLE)};
    var mode = ${JSON.stringify(DEFAULT_MODE)};
    if (raw) {
      var parsed = JSON.parse(raw);
      if (${JSON.stringify(STYLES.map((s) => s.id))}.indexOf(parsed.style) !== -1) style = parsed.style;
      if (parsed.mode === 'light' || parsed.mode === 'dark') mode = parsed.mode;
    }
    document.documentElement.dataset.style = style;
    document.documentElement.dataset.mode = mode;
  } catch (e) {}
})();
`;

export function applyTheme(style: StyleId, mode: Mode) {
  document.documentElement.dataset.style = style;
  document.documentElement.dataset.mode = mode;
}

export function saveTheme(style: StyleId, mode: Mode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ style, mode }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — theme just won't persist.
  }
}

export function loadTheme(): { style: StyleId; mode: Mode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isStyleId(parsed.style) && (parsed.mode === 'light' || parsed.mode === 'dark')) {
        return { style: parsed.style, mode: parsed.mode };
      }
    }
  } catch {
    // ignore malformed/missing storage
  }
  return { style: DEFAULT_STYLE, mode: DEFAULT_MODE };
}
