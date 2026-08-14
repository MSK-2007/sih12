/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0284c7',
          600: '#0369a1',
          900: '#0c4a6e',
        },
        emergency: {
          critical: '#ef4444', // Red
          high: '#f97316',     // Orange
          medium: '#f59e0b',   // Amber
          low: '#10b981',      // Emerald
          info: '#3b82f6',     // Blue
        },
        control: {
          bg: '#090d16',
          card: '#111827',
          border: '#1f293d',
          hover: '#1e293b',
        }
      },
    },
  },
  plugins: [],
}
