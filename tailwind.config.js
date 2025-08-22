/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orion: {
          50: '#f0f8ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Additional Orion brand colors
        'orion-dark': '#1e293b',
        'orion-light': '#f8fafc',
        'orion-accent': '#3b82f6',
        'orion-success': '#10b981',
        'orion-warning': '#f59e0b',
        'orion-error': '#ef4444',
      },
      fontFamily: {
        'orion': ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'orion-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
        'orion-gradient-dark': 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
      },
    },
  },
  plugins: [],
};
