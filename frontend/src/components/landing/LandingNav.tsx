import Link from 'next/link'
import { NavThemeIcon } from './NavThemeIcon'
import { MobileDrawer } from './MobileDrawer'
import { NavAuthButtons } from './NavAuthButtons'

export function LandingNav() {
  return (
    <header>
      <nav className="ld-nav" aria-label="Main navigation">
        {/* Logo — matches dashboard Topbar style */}
        <Link href="/" className="ld-nav__logo" aria-label="Built for Bookkeepers home">
          <span className="ld-nav__logo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width={19} height={19}>
              <circle cx="12"   cy="14.6" r="5.1"  fill="#fff" />
              <circle cx="6.4"  cy="8.6"  r="2.25" fill="#fff" />
              <circle cx="12"   cy="6.1"  r="2.25" fill="#fff" />
              <circle cx="17.6" cy="8.6"  r="2.25" fill="#fff" />
            </svg>
          </span>
          <span className="ld-nav__logo-text">Built for Bookkeepers</span>
        </Link>

        {/* Desktop links */}
        <div className="ld-nav__links">
          <a href="#how-it-works" className="ld-nav__link">How it works</a>
          <a href="#pricing"      className="ld-nav__link">Pricing</a>
          <a href="#faq"          className="ld-nav__link">FAQ</a>
          <div className="ld-nav__divider" aria-hidden="true" />
          <NavThemeIcon />
          <NavAuthButtons />
        </div>

        {/* Mobile: hamburger + drawer */}
        <MobileDrawer />
      </nav>
    </header>
  )
}
