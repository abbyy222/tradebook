/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: {
          950: '#0e0804',
          900: '#1a0f0a',
          800: '#261610',
          700: '#341e16',
          600: '#4a2b1e',
          500: '#6b3d2b',
        },
        terracotta: {
          900: '#7a2e10',
          800: '#9e3a14',
          700: '#c04818',
          600: '#c4622d',
          500: '#d4743e',
          400: '#e08b5a',
          300: '#eda882',
          200: '#f2c4a8',
          100: '#f8e0d0',
          50: '#fdf3ec',
        },
        gold: {
          900: '#6b4200',
          800: '#8f5800',
          700: '#b57000',
          600: '#c98c10',
          500: '#e8a838',
          400: '#f0bc5a',
          300: '#f5ce7e',
          200: '#f9e0a8',
          100: '#fcefd6',
          50: '#fef8ec',
        },
        indigo: {
          950: '#0d1033',
          900: '#151a4a',
          800: '#1e2460',
          700: '#2d3a7c',
          600: '#3d4e96',
          500: '#5468b4',
          400: '#7585c8',
          300: '#9aaad8',
          200: '#c0caf8',
          100: '#e4e7f4',
        },
        cream: {
          50: '#fdf9f4',
          100: '#f8f0e6',
          200: '#f0e2d0',
          300: '#e5d0b8',
          400: '#d4b898',
          500: '#bf9a78',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        ui: ['Epilogue', 'system-ui', 'sans-serif'],
        body: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        nav: '72px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'drift-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.05)' },
        },
        'drift-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-20px, 15px) scale(0.97)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'gold-sweep': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        spin: {
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)',
        'fade-in': 'fade-in 0.25s ease',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 1.5s infinite',
        'drift-1': 'drift-1 14s ease-in-out infinite',
        'drift-2': 'drift-2 11s ease-in-out infinite',
        pulse: 'pulse 2s ease infinite',
        'slide-down': 'slide-down 0.3s ease',
        'gold-sweep': 'gold-sweep 3s linear infinite',
        spin: 'spin 0.8s linear infinite',
      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
      boxShadow: {
        terracotta: '0 4px 24px rgba(196, 98, 45, 0.3)',
        gold: '0 4px 24px rgba(232, 168, 56, 0.3)',
        earth: '0 8px 40px rgba(10, 5, 2, 0.6)',
        'glow-terra': '0 0 0 3px rgba(196, 98, 45, 0.2)',
        'glow-gold': '0 0 0 3px rgba(232, 168, 56, 0.2)',
        nav: '0 -1px 0 rgba(255,255,255,0.05)',
      },
      borderRadius: {
        xl2: '20px',
        xl3: '28px',
      },
    },
  },
  plugins: [],
}
