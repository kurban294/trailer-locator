/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ringColor: {
        DEFAULT: '#ef4444', // red-500
      },
      ringWidth: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
