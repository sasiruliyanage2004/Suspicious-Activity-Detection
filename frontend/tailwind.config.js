/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0B0E13',
          900: '#0D1016',
          800: '#12161D',
          700: '#171C25',
          600: '#1D232E',
        },
        cyan: {
          glow: '#0EA5E9',
        },
        amber: {
          glow: '#FF8A00',
        },
        crimson: {
          glow: '#FF003C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 0 1px rgba(14,165,233,0.15), 0 0 24px -4px rgba(14,165,233,0.35)',
        'glow-cyan-sm': '0 0 12px -2px rgba(14,165,233,0.45)',
        'glow-amber': '0 0 0 1px rgba(255,138,0,0.15), 0 0 24px -4px rgba(255,138,0,0.35)',
        'glow-crimson': '0 0 0 1px rgba(255,0,60,0.2), 0 0 28px -2px rgba(255,0,60,0.45)',
        'glass': '0 8px 32px -8px rgba(0,0,0,0.5)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,0,60,0.55)' },
          '50%': { opacity: '0.85', boxShadow: '0 0 0 8px rgba(255,0,60,0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'rise': 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
