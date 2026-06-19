/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--color-bg) / <alpha-value>)',
        'surface-secondary': 'rgb(var(--color-bg-secondary) / <alpha-value>)',
        'surface-tertiary': 'rgb(var(--color-bg-tertiary) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',

        // Fixed: Properly placed inside colors and using the alpha channel format
        accent: {
          DEFAULT: 'rgb(var(--color-accent-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },

        // New accent colors
        blue: {
          DEFAULT: 'rgb(var(--color-blue-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-blue-hover) / <alpha-value>)',
          light: 'rgb(var(--color-blue-light) / <alpha-value>)',
        },

        purple: {
          DEFAULT: 'rgb(var(--color-purple-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-purple-hover) / <alpha-value>)',
          light: 'rgb(var(--color-purple-light) / <alpha-value>)',
        },

        orange: {
          DEFAULT: 'rgb(var(--color-orange-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-orange-hover) / <alpha-value>)',
          light: 'rgb(var(--color-orange-light) / <alpha-value>)',
        },

        cyan: {
          DEFAULT: 'rgb(var(--color-cyan-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-cyan-hover) / <alpha-value>)',
          light: 'rgb(var(--color-cyan-light) / <alpha-value>)',
        },

        amber: {
          DEFAULT: 'rgb(var(--color-amber-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-amber-hover) / <alpha-value>)',
          light: 'rgb(var(--color-amber-light) / <alpha-value>)',
        },

        success: '#059669',
        danger: '#dc2626',
        warning: '#d97706',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 14px rgba(0, 0, 0, 0.03)',
        'accent-glow': '0 4px 20px rgba(5, 150, 105, 0.12)',
      },
    },
  },
  plugins: [],
};
