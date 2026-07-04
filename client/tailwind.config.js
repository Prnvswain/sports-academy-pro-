/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Shadcn UI Elements mapping - Upgraded with <alpha-value> to support modern glassmorphism (e.g., bg-background/80)
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        
        // Your Existing App Core Theme Aliases - Upgraded with <alpha-value> for seamless blending
        surface: "rgb(var(--color-bg-secondary) / <alpha-value>)",
        "surface-secondary": "rgb(var(--color-bg-tertiary) / <alpha-value>)",
        success: "rgb(var(--color-accent-primary) / <alpha-value>)",
        danger: "rgb(239 68 68 / <alpha-value>)",
        blue: "rgb(var(--color-blue-primary) / <alpha-value>)",
        purple: "rgb(var(--color-purple-primary) / <alpha-value>)",
        amber: "rgb(var(--color-amber-primary) / <alpha-value>)",
        orange: "rgb(var(--color-orange-primary) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan-primary) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Added subtle premium SaaS box shadows
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
        'glow-primary': '0 0 24px rgba(16, 185, 129, 0.25)', 
        'float': '0 10px 40px -10px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}