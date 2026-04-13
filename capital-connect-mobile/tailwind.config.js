/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1865f6',
        'primary-dark': '#1251cc',
        'primary-light': '#3486e8',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        surface: '#ffffff',
        elevated: '#f8fafc',
        muted: '#94a3b8',
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
