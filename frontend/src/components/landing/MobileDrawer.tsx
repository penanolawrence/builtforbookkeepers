'use client'

import { useState } from 'react'
import { useTheme } from '@/components/layout/ThemeProvider'

export function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <>
      <button
        className="ld-nav__hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`ld-drawer${open ? ' ld-drawer--open' : ''}`} role="navigation" aria-label="Site navigation">
        <a href="#how-it-works" className="ld-drawer__link" onClick={() => setOpen(false)}>How it works</a>
        <a href="#pricing"      className="ld-drawer__link" onClick={() => setOpen(false)}>Pricing</a>
        <a href="#faq"          className="ld-drawer__link" onClick={() => setOpen(false)}>FAQ</a>
        <div className="ld-drawer__theme-row">
          <span>Dark mode</span>
          <button
            className="ld-nav__theme-btn"
            onClick={() => setTheme(theme === 'sofia' ? 'yoda' : 'sofia')}
            aria-label={theme === 'yoda' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'yoda' ? '☀️' : '🌙'}
          </button>
        </div>
        <a href="#cta" className="ld-drawer__link ld-drawer__link--cta" onClick={() => setOpen(false)}>Get Started →</a>
      </div>
    </>
  )
}
