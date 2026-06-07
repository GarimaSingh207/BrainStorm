/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { canvas: '#0f1127', surface: '#181a30', 'surface-elevated': '#1c1e34', 'surface-highlight': '#31334b', primary: { DEFAULT: '#cabeff', container: '#937dff', deep: '#31009a' }, secondary: { DEFAULT: '#ffafd8', container: '#851260' }, accent: { DEFAULT: '#3ddccb', container: '#00a295' }, text: { main: '#e0e0ff', muted: '#938ea1' } },
      fontFamily: { sans: ['"Be Vietnam Pro"', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'sans-serif'] },
      borderRadius: { xl: '1rem', '2xl': '1.5rem', '3xl': '2rem', pill: '9999px' },
      boxShadow: { 'glow-primary': '0 12px 64px -12px rgba(147, 125, 255, 0.6)', 'glow-secondary': '0 12px 64px -12px rgba(255, 175, 216, 0.6)', 'btn-heavy': '0 12px 0 0 rgba(0, 0, 0, 0.5), inset 0 2px 0 0 rgba(255, 255, 255, 0.3)', 'btn-hover': '0 20px 0 0 rgba(0, 0, 0, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.4)', 'btn-pressed': '0 0px 0 0 rgba(0, 0, 0, 0.5), inset 0 -2px 0 0 rgba(255, 255, 255, 0.2)', island: '16px 16px 0px 0px rgba(0, 0, 0, 0.6)' },
      animation: { float: 'float 6s ease-in-out infinite', 'pulse-glow': 'pulse-glow 3s ease-in-out infinite' },
      keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }, 'pulse-glow': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } } },
    },
  },
  plugins: [],
};
