/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00e5ff',     // Custom cyan
        secondary: '#ff5722',   // Custom orange
        background: '#000000',
        foreground: '#ffffff',
        muted: { foreground: '#a1a1aa' }
      }
    },
  },
  plugins: [],
}