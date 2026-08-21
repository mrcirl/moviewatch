import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0b0d12',
          900: '#12151c',
          800: '#1a1f29',
          700: '#242b38',
          600: '#333c4d',
          400: '#8791a3',
          200: '#d7dbe3',
        },
        accent: {
          500: '#6c5ce7',
          400: '#8579ec',
        },
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
