const withMT = require('@material-tailwind/react/utils/withMT');

/** @type {import('tailwindcss').Config} */
module.exports = withMT({
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    colors: {
      'gray-dark': '#252525',
      gray: '#454545',
      'gray-light': '#949699',
      'gray-lighter': '#C9C9C9',
      white: '#FFFFFF',
      blue: '#0582FF',
      green: '#0E912E',
      red: '#E22E2E',
      orange: '#FFA500',
      black: '#000000',
    },
    fontFamily: {
      sans: ['Poppins', 'sans-serif'],
      mono: ['Roboto Mono', 'monospace'],
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
    },
    extend: {},
  },
  plugins: [],
});
