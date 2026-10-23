/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // User Selected Palette: Sage Olive & Forest Luxury
        palette: {
          light:   '#E8E9DF', // Light Sand/Ecru
          sage:    '#A9B887', // Muted Sage/Olive Accent
          forest:  '#2E3D28', // Deep Forest Pine
          deep:    '#1E291A', // Ultra Deep Forest
          surface: '#F4F5EF', // Crisp Light Surface
          border:  '#D4D7C7', // Refined Border
          muted:   '#606E5A', // Supporting Text
        },
        semantic: {
          success: '#3D7A44',
          warning: '#C28424',
          danger:  '#B83A3A',
          info:    '#476852',
        },
      },
      boxShadow: {
        'subtle':      '0 1px 3px rgba(46, 61, 40, 0.05), 0 1px 2px rgba(46, 61, 40, 0.03)',
        'card':        '0 4px 20px -2px rgba(46, 61, 40, 0.06), 0 2px 6px -1px rgba(46, 61, 40, 0.03)',
        'card-hover':  '0 14px 34px -4px rgba(46, 61, 40, 0.12), 0 4px 12px -2px rgba(46, 61, 40, 0.04)',
        'elevation':   '0 20px 48px -8px rgba(46, 61, 40, 0.16), 0 8px 16px -4px rgba(46, 61, 40, 0.06)',
        'sage-glow':   '0 0 24px rgba(169, 184, 135, 0.45)',
      },
    },
  },
  plugins: [],
}
