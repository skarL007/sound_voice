/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ECFCFF',
          100: '#CFF8FF',
          200: '#A5F0FF',
          300: '#74E8FF',
          400: '#49E6FF',
          500: '#1FD0F0',
          600: '#10A6C5',
          700: '#117D95',
          800: '#125E71',
          900: '#103F4C',
        },
        accent: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        ember: {
          100: '#FFE2D6',
          300: '#FFB291',
          500: '#FF8A5B',
          600: '#F06B34',
          700: '#BF4E20',
        },
        chrome: {
          950: '#06090D',
          900: '#0C1219',
          850: '#111A24',
          800: '#16212D',
          700: '#1B2836',
          600: '#243446',
          500: '#33506B',
        },
        signal: {
          success: '#61E4A3',
          warning: '#FFC15A',
          danger: '#FF6B7D',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-small': 'bounce 1s infinite',
        'glow-soft': 'glow-soft 2.6s ease-in-out infinite',
        'lift-in': 'lift-in 240ms ease-out both',
      },
      keyframes: {
        'glow-soft': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(73,230,255,0)' },
          '50%': { boxShadow: '0 0 24px rgba(73,230,255,0.22)' },
        },
        'lift-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
