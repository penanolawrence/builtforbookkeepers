// src/components/landing/HeroSection.tsx
import { ReviewQueueMockup } from '@/components/landing/ReviewQueueMockup'

export function HeroSection() {
  return (
    <section id="hero" className="ld-hero" aria-labelledby="hero-heading">
      <div className="ld-hero__copy">
        <p className="ld-hero__badge">✦ Built for Philippine Bookkeepers</p>
        <h1 id="hero-heading" className="ld-hero__h1">
          Take on more clients,<br />
          <em>not more hours</em>
        </h1>
        <p className="ld-hero__sub">
          Sofia Books organizes your clients&rsquo; receipts, sorts everything into
          an AI-powered review queue, and generates your BIR books on demand — so
          you can grow without burning out.
        </p>
        <div className="ld-hero__ctas">
          <a href="#cta" className="ld-btn-primary">Get Started — ₱999/mo</a>
          <a href="#how-it-works" className="ld-btn-ghost">See how it works →</a>
        </div>
        <p className="ld-hero__trust">
          No contracts <span aria-hidden="true">·</span> Cancel anytime <span aria-hidden="true">·</span> Everything included
        </p>
      </div>

      <div className="ld-hero__mockup">
        <ReviewQueueMockup />
      </div>
    </section>
  )
}
