import Link from 'next/link'
import { NavThemeIcon } from './NavThemeIcon'
import { MobileDrawer } from './MobileDrawer'
import { NavAuthButtons } from './NavAuthButtons'
import { BFBLogo } from '@/components/shared/BFBLogo'

export function LandingNav() {
  return (
    <header>
      <nav className="ld-nav" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" aria-label="Built for Bookkeepers home" style={{ textDecoration: 'none' }}>
          <BFBLogo layout="horizontal" size={38} showTagline={true} className="bfb-logo--sm" />
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
