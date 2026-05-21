import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        squad: {
          bg: '#07041a',
          panel: 'rgba(7,4,26,0.96)',
          accent: '#f0abfc',
          accent2: '#c8a8e8',
          border: 'rgba(255,255,255,0.08)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
