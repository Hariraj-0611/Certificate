/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hades: {
          bg: '#0F172A',
          card: '#1E293B',
          accent: '#3B82F6',
          gold: '#D97706',
          goldHover: '#B45309',
          border: '#334155',
          textMuted: '#94A3B8',
        }
      }
    },
  },
  plugins: [],
}
