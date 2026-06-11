/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-bg)',
        'surface-secondary': 'var(--color-bg-secondary)',
        border: 'var(--color-border)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        
        // Fixed: Properly placed inside colors and using the alpha channel format
        accent: {
          DEFAULT: 'rgb(var(--color-accent-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)'
        },
        
        success: '#059669',
        danger: '#dc2626',
        warning: '#d97706'
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ]
      },
      boxShadow: {
        card: '0 4px 14px rgba(0, 0, 0, 0.03)',
        'accent-glow': '0 4px 20px rgba(5, 150, 105, 0.12)'
      }
    }
  },
  plugins: []
};