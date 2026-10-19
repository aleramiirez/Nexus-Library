/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      colors: {
        nexus: {
          bg: '#0D1017',
          surface: '#151A24',
          card: '#1B2230',
          border: '#283246',
          burgundy: '#6E1E2A',
          amber: '#D49B4B',
          gold: '#E5C158'
        }
      }
    }
  },
  plugins: []
};
