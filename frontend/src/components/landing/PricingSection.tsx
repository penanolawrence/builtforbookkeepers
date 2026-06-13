// src/components/landing/PricingSection.tsx
const FEATURES = [
  'Unlimited client companies',
  'AI-assisted transaction classification',
  'Red / Yellow / Green approval queue',
  '4 BIR books generated on demand',
  'Multi-client dashboard',
  'Adjusting entries + full audit trail',
  'Mobile-first client upload page',
]

export function PricingSection() {
  return (
    <section id="pricing" className="ld-section ld-section--alt" aria-labelledby="pricing-heading">
      <p className="ld-label">Pricing</p>
      <h2 id="pricing-heading" className="ld-title">One plan. Everything included.</h2>
      <p className="ld-sub">No tiers, no add-ons, no surprises. One flat monthly fee for your entire firm.</p>

      <div className="ld-pricing__card">
        <div className="ld-pricing__glow" aria-hidden="true" />
        <p className="ld-pricing__pill">Built for Bookkeepers</p>
        <p aria-label="Price: 999 pesos per month">
          <span className="ld-pricing__currency" aria-hidden="true">₱</span>
          <span className="ld-pricing__amount">999</span>
        </p>
        <p className="ld-pricing__period">per month · billed per firm</p>
        <ul className="ld-pricing__features" aria-label="What's included">
          {FEATURES.map((f) => (
            <li key={f} className="ld-pricing__feature">
              <span className="ld-pricing__check" aria-hidden="true">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <a href="#cta" className="ld-pricing__cta">Get started — contact us</a>
        <p className="ld-pricing__trial">No contracts. Cancel anytime.</p>
      </div>
    </section>
  )
}
