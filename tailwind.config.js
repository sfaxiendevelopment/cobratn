/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cobra: {
          black: '#000000',
          dark: '#151515',
          gray: '#555555',
          light: '#B0B0B0',
          offwhite: '#F5F5F5',
          white: '#FFFFFF',
          950: '#0A0A0A',
          900: '#111111',
          800: '#1C1C1C',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wide2: '0.2em',
        wide3: '0.3em',
        widest2: '0.5em',
      },
      maxWidth: {
        page: '1440px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease both',
        'fade-in-slow': 'fadeIn 1.2s ease both',
        'slide-up': 'slideUp 0.6s ease both',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scaleIn 0.25s ease both',
        'shimmer': 'shimmer 1.6s linear infinite',
        'ken-burns': 'kenBurns 14s ease-out both',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        kenBurns: {
          from: { transform: 'scale(1.15)' },
          to: { transform: 'scale(1)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}