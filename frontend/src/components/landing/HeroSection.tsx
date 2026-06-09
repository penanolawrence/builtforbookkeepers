// src/components/landing/HeroSection.tsx
import PugMascot from '@/components/login/PugMascot'

export function HeroSection() {
  return (
    <section id="hero" className="ld-hero" aria-labelledby="hero-heading">
      <div className="ld-hero__copy">
        <p className="ld-hero__badge">✦ Built for Philippine Bookkeepers</p>
        <h1 id="hero-heading" className="ld-hero__h1">
          Take on more clients<br />without adding more hours
        </h1>
        <p className="ld-hero__sub">
          Sofia Books organizes your clients&rsquo; receipts, flags what needs your
          attention, and generates your BIR books on demand — so you can grow your
          practice without burning out.
        </p>
        <div className="ld-hero__ctas">
          <a href="#cta" className="ld-btn-primary">Get Started — ₱999/mo</a>
          <a href="#how-it-works" className="ld-btn-ghost">See how it works →</a>
        </div>
      </div>

      <div className="ld-hero__mascot" aria-hidden="true">
        <PugMascot
          variant="sofia"
          accent="#E2568C"
          accentGlow="#FFADD2"
          peeking={false}
          happy={false}
          size={160}
        />
      </div>
    </section>
  )
}
