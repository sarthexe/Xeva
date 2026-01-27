'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Resolve the actual theme (handles 'system' preference)
  const resolveTheme = (themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return themeValue
  }

  useEffect(() => {
    // Check local storage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme)
      setResolvedTheme(resolveTheme(savedTheme))
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(systemDark ? 'dark' : 'light')
    }
    setMounted(true)
  }, [])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  useEffect(() => {
    if (!mounted) return

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolvedTheme)
    localStorage.setItem('theme', theme)
  }, [theme, resolvedTheme, mounted])

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
    setThemeState(newTheme)
    setResolvedTheme(newTheme)
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    setResolvedTheme(resolveTheme(newTheme))
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
