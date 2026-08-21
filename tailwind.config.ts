import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Values come from CSS custom properties set per [data-style][data-mode]
        // in globals.css, stored as "R G B" triples so opacity modifiers
        // (e.g. bg-base-950/90) keep working.
        base: {
          950: 'rgb(var(--color-base-950) / <alpha-value>)',
          900: 'rgb(var(--color-base-900) / <alpha-value>)',
          800: 'rgb(var(--color-base-800) / <alpha-value>)',
          700: 'rgb(var(--color-base-700) / <alpha-value>)',
          600: 'rgb(var(--color-base-600) / <alpha-value>)',
          400: 'rgb(var(--color-base-400) / <alpha-value>)',
          200: 'rgb(var(--color-base-200) / <alpha-value>)',
        },
        accent: {
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          soft: 'rgb(var(--color-danger-soft) / <alpha-value>)',
        },
        // The logo/wordmark keep a fixed identity regardless of site style —
        // brand colors, not theme colors.
        brand: {
          violet: '#7c4dff',
          magenta: '#ff3d81',
          orange: '#ff8a3d',
          cyan: '#37e6e6',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
