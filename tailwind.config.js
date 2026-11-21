/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1b26',
          50: '#f8f9fc',
          100: '#eef0f6',
          200: '#d5d9e8',
          700: '#2a2b3d',
          800: '#1f2030',
          900: '#161724',
        },
        accent: {
          DEFAULT: '#7c9eff',
          dim: '#5a7fd4',
          glow: '#a8c0ff',
        },
        node: {
          daily: '#ffd166',
          task: '#06d6a0',
          project: '#7c9eff',
          note: '#ef476f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
