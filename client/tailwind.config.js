/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030304',
          900: '#09090c',
          850: '#111116',
          800: '#181820',
          700: '#232330',
          600: '#323242'
        },
        pixel: {
          yellow: '#FFE600',
          yellowHover: '#E5CF00',
          cyan: '#00F5FF',
          cyanGlow: '#06B6D4',
          magenta: '#FF007F',
          magentaGlow: '#EC4899',
          orange: '#FF6B00',
          purple: '#9333EA'
        }
      },
      fontFamily: {
        display: ['Impact', 'Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'neon-yellow': '0 0 20px rgba(255, 230, 0, 0.35)',
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.35)',
        'neon-magenta': '0 0 20px rgba(255, 0, 127, 0.35)',
        'glow-box': '0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 1px rgba(255, 255, 255, 0.1)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
};
