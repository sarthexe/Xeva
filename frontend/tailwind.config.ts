import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#27cab3', // User provided
          dark: '#0fb9c0',    // User provided (using the second color as "dark" or accent variant)
          light: '#e0fcf9',   // Very light version for backgrounds
        },
        accent: {
          DEFAULT: '#0fb9c0', // User provided
          hover: '#0ea5ac',   // Slightly darker for hover states
        },
        // Semantic colors
        user: {
          bg: '#27cab3',
          text: '#FFFFFF',
        },
        assistant: {
          bg: '#FFFFFF',
          text: '#374151',
          border: '#E5E7EB',
        },
        // Model specific colors (adjusted to harmonize)
        haiku: { DEFAULT: '#27cab3', bg: '#e0fcf9' },
        sonnet: { DEFAULT: '#0fb9c0', bg: '#e0f7fa' },
        opus: { DEFAULT: '#f59e0b', bg: '#fef3c7' }, // Keep opus distinct (gold/amber)
        
        surface: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--surface-tertiary)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'], // Added for that "editorial" feel if needed
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'float': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #27cab3 0%, #0fb9c0 100%)',
      },
    },
  },
  plugins: [],
}
export default config
