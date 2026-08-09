import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          card: '#13131a',
          elevated: '#1a1a24',
        },
        accent: {
          purple: '#8b5cf6',
          indigo: '#6366f1',
          blue: '#3b82f6',
        },
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.4)',
        card: '0 8px 30px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
