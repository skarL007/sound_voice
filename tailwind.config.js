/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand: roxo neon gamer
        brand: {
          50: '#F5F0FF',
          100: '#E9DCFF',
          200: '#D3B8FF',
          300: '#B98EFF',
          400: '#A06EFF',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#5F23C2',
          800: '#3F1791',
          900: '#1B0B3C',
        },
        // Secondary: cyan (ex-brand). Reservado para estado "ao vivo" / transmitindo.
        secondary: {
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
        // Accent: alias do brand roxo (compat com codigo legado que usava 'accent').
        accent: {
          50: '#F5F0FF',
          100: '#E9DCFF',
          200: '#D3B8FF',
          300: '#B98EFF',
          400: '#A06EFF',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#5F23C2',
          800: '#3F1791',
          900: '#1B0B3C',
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
        // Surfaces (escalonamento de profundidade)
        surface: {
          base: '#0A0716',
          raised: '#13092B',
          sunken: '#06030F',
        },
        // Texto (hierarquia)
        ink: {
          strong: '#F3F0FF',
          body: '#C9BEE6',
          soft: '#8B7FB0',
          mute: '#5E5380',
        },
        // Estados semanticos
        state: {
          ready: '#8B5CF6',
          live: '#49E6FF',
          warn: '#FFC15A',
          error: '#FF6B7D',
          success: '#61E4A3',
        },
        // HUD (linhas, frames, grid)
        hud: {
          border: 'rgba(167,139,250,0.32)',
          'border-strong': 'rgba(167,139,250,0.66)',
          grid: 'rgba(167,139,250,0.06)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-small': 'bounce 1s infinite',
        'glow-soft': 'glow-soft 2.6s ease-in-out infinite',
        'lift-in': 'lift-in 240ms ease-out both',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'text-shimmer': 'text-shimmer 4s linear infinite',
        'scanline-sweep': 'scanline-sweep 7s linear infinite',
        'hud-flicker': 'hud-flicker 5s steps(20, end) infinite',
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
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(139,92,246,0)' },
          '50%': { boxShadow: '0 0 28px rgba(139,92,246,0.38)' },
        },
        'text-shimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'scanline-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'hud-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Cascadia Code"', '"Consolas"', 'monospace'],
      },
    },
  },
  plugins: [],
}
