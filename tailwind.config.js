/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        '#09101E',
        surface:   '#0F1829',
        card:      '#141E33',
        border:    '#1E2D4E',
        accent:    '#E94560',
        'accent-dim': '#9B2335',
        muted:     '#4B5563',
        subtle:    '#9CA3AF',
        done:      '#4ade80',
        warn:      '#f472b6',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.4s ease both',
        'tick':       'tick 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'pop':        'pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        tick:      { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        pop:       { from: { transform: 'scale(0.5)', opacity: '0' }, '65%': { transform: 'scale(1.2)' }, to: { transform: 'scale(1)', opacity: '1' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 0px rgba(233,69,96,0)' }, '50%': { boxShadow: '0 0 18px rgba(233,69,96,0.45)' } },
        float:     { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-4px)' } },
      },
    },
  },
  plugins: [],
}
