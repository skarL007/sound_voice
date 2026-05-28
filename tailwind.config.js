/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Brand: indigo/violeta refinado — só para ação primária + nav ativo.
        brand: {
          50: '#EEECFB',
          100: '#DAD5F6',
          200: '#B8ADEE',
          300: '#9585E5',
          400: '#7C6BDE',
          500: '#6D5DE6',
          600: '#5A49D8',
          700: '#4A3BB4',
          800: '#372C86',
          900: '#241D57',
        },
        // Secondary cyan: reservado para estado "ao vivo" / transmitindo.
        secondary: {
          50: '#ECFCFF',
          100: '#CFF8FF',
          200: '#A5F0FF',
          300: '#74E8FF',
          400: '#49E6FF',
          500: '#22C9EC',
          600: '#10A6C5',
          700: '#117D95',
          800: '#125E71',
          900: '#103F4C',
        },
        // Accent: alias do brand (compat com código legado que usava 'accent').
        accent: {
          50: '#EEECFB',
          100: '#DAD5F6',
          200: '#B8ADEE',
          300: '#9585E5',
          400: '#7C6BDE',
          500: '#6D5DE6',
          600: '#5A49D8',
          700: '#4A3BB4',
          800: '#372C86',
          900: '#241D57',
        },
        // Ember: laranja discreto (compat).
        ember: {
          100: '#FBE6DA',
          300: '#F2B58E',
          500: '#E58B57',
          600: '#CC723E',
          700: '#A6562B',
        },
        // Chrome: escala neutra fria (compat com refs legadas).
        chrome: {
          950: '#0B0E14',
          900: '#0F131A',
          850: '#141923',
          800: '#1A2029',
          700: '#222935',
          600: '#2E3744',
          500: '#3C4654',
        },
        signal: {
          success: '#5BD8A0',
          warning: '#F5B544',
          danger: '#F0697A',
        },
        // Superfícies (profundidade por luminância, neutras).
        surface: {
          base: '#0F131A',
          raised: '#161B24',
          sunken: '#0B0E14',
        },
        // Texto (hierarquia, contraste AA sobre surface-base).
        ink: {
          strong: '#F2F5F9',
          body: '#C4CCD6',
          soft: '#8A93A0',
          mute: '#5C6470',
        },
        // Estados semânticos.
        state: {
          ready: '#6D5DE6',
          live: '#49E6FF',
          warn: '#F5B544',
          error: '#F0697A',
          success: '#5BD8A0',
        },
        // Bordas/linhas neutras (sem o roxo translúcido do HUD antigo).
        hud: {
          border: 'rgba(255,255,255,0.09)',
          'border-strong': 'rgba(255,255,255,0.18)',
          grid: 'rgba(255,255,255,0.03)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-small': 'bounce 1s infinite',
        'lift-in': 'lift-in 200ms ease-out both',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // Efeitos antigos neutralizados (design v2 — calma > espetáculo).
        'glow-soft': 'none',
        'glow-pulse': 'none',
        'text-shimmer': 'none',
        'scanline-sweep': 'none',
        'hud-flicker': 'none',
      },
      keyframes: {
        'lift-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Cascadia Code"', '"Consolas"', 'monospace'],
      },
      // Escala tipográfica semântica — usar no lugar de text-xs/sm/base cru.
      // caption → 11px meta/badge, label → 12px tags/inputs, body → 14px copy,
      // ui → 15px interactive, heading → 17px sections, title → 20px cards,
      // page → 24px page headings, hero → 30px display.
      fontSize: {
        caption: ['0.6875rem', { lineHeight: '1rem' }],
        label:   ['0.75rem',   { lineHeight: '1rem' }],
        body:    ['0.875rem',  { lineHeight: '1.375rem' }],
        ui:      ['0.9375rem', { lineHeight: '1.5rem' }],
        heading: ['1.0625rem', { lineHeight: '1.5rem' }],
        title:   ['1.25rem',   { lineHeight: '1.75rem' }],
        page:    ['1.5rem',    { lineHeight: '2rem' }],
        hero:    ['1.875rem',  { lineHeight: '2.25rem' }],
      },
    },
  },
  plugins: [],
}
