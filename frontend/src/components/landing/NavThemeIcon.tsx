'use client'

import { useTheme } from '@/components/layout/ThemeProvider'

export function NavThemeIcon() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'yoda'

  return (
    <button
      className="ld-nav__theme-btn"
      onClick={() => setTheme(isDark ? 'sofia' : 'yoda')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
