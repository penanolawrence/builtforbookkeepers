// src/components/landing/LandingNav.tsx
import Link from 'next/link'
import PugMascot from '@/components/login/PugMascot'
import { NavThemeIcon } from './NavThemeIcon'
import { MobileDrawer } from './MobileDrawer'

export function LandingNav() {
  return (
    <header>
      <nav className="ld-nav" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" className="ld-nav__logo" aria-label="Sofia Books home">
          <PugMascot
            variant="sofia"
            accent="#E2568C"
            accentGlow="#FFADD2"
            peeking={false}
            happy={false}
            size={32}
          />
          <span className="ld-nav__logo-text">Sofia Books</span>
        </Link>

        {/* Desktop links */}
        <div className="ld-nav__links">
          <a href="#how-it-works" className="ld-nav__link">How it works</a>
          <a href="#pricing"      className="ld-nav__link">Pricing</a>
          <a href="#faq"          className="ld-nav__link">FAQ</a>
          <div className="ld-nav__divider" aria-hidden="true" />
          <NavThemeIcon />
          <Link href="/login" className="ld-nav__login">Log in</Link>
          <a href="#cta" className="ld-nav__cta">Get Started</a>
        </div>

        {/* Mobile: hamburger + drawer */}
        <MobileDrawer />
      </nav>
    </header>
  )
}
