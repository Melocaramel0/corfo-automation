/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === COLORES PRIMARIOS ===
        corfo: {
          // BLUE (Primary Color)
          20: '#F1F7FB',  // BLUE 20
          50: '#B8D5EC',  // BLUE 50
          75: '#6CA8DA',  // BLUE 75
          500: '#0F69B4', // BLUE (Primary Color)
          // Extended scale for compatibility
          100: '#F1F7FB',
          200: '#B8D5EC',
          300: '#6CA8DA',
          400: '#0F69B4',
          600: '#0C5A9A',
          700: '#0A4B80',
          800: '#073C66',
          900: '#052D4C',
        },
        corfoRed: {
          // RED (Secondary Color)
          20: '#FFF1F2',  // RED 20
          50: '#FFBFC2',  // RED 50
          75: '#FC7C83',  // RED 75
          500: '#EB3C46',  // RED (Secondary Color)
          // Extended scale for compatibility
          100: '#FFF1F2',
          200: '#FFBFC2',
          300: '#FC7C83',
          400: '#EB3C46',
          600: '#D9353F',
          700: '#C72E38',
          800: '#B52731',
          900: '#A3202A',
        },
        corfoDark: {
          // Primary Colors
          blue: '#221E7C',   // DARK BLUE (Primary Color)
          gray: '#3F3F3F',   // DARK GRAY (Secondary Color)
        },
        
        // === COLORES SECUNDARIOS / FEEDBACK ===
        corfoCyan: {
          100: '#37C2D9',
          90: '#72C7D5',
          75: '#96D5E0',
          50: '#B9E3EB',
          25: '#DCF1F5',
        },
        corfoAqua: {
          100: '#2AD6A4',
          90: '#78D6BB',
          75: '#9AE0CB',
          50: '#BBEBD0',
          25: '#DDF5EE',
        },
        corfoCoral: {
          100: '#FF4C42',
          90: '#FD8983',
          75: '#FDA7A1',
          50: '#FEC4C1',
          25: '#FEE2E0',
        },
        corfoYellow: {
          100: '#F5B100',
          90: '#F9D473',
          75: '#FFE39C',
          50: '#FFEBB9',
          25: '#FFF7E3',
        },
        
        // === GRAYSCALE ===
        corfoGray: {
          100: '#000000',
          90: '#1C1C1C',
          80: '#3F3F3F',
          60: '#7F7F7F',
          40: '#CFCFCF',
          20: '#F3F3F3',
          10: '#FBFBFB',
          0: '#FFFFFF',
        },
      }
    },
  },
  plugins: [],
}
