// src/components/landing/FeaturesSection.tsx
const FEATURES = [
  { icon: '🚦', title: 'Red / Yellow / Green queue',  desc: 'Anomalies surface automatically. Green items batch-approve in one click. Red items require individual review.' },
  { icon: '🧾', title: '4 BIR books in one click',    desc: 'CRB, CDB, General Journal, and General Ledger — formatted for loose-leaf BIR submission.' },
  { icon: '💸', title: 'VAT auto-computation',         desc: '12% VAT split for VAT-registered clients. Full-amount posting for Non-VAT clients.' },
  { icon: '📊', title: 'Multi-client dashboard',       desc: 'All your clients in one screen. See who has anomalies or pending items before month-end hits.' },
  { icon: '🔁', title: 'Adjusting entries',            desc: 'Reclassify, reverse, or add entries with a full permanent audit trail.' },
  { icon: '📱', title: 'Mobile-first upload',          desc: 'Clients upload from any phone browser — no app install. GCash screenshots accepted.' },
]

export function FeaturesSection() {
  return (
    <section id="features" className="ld-section" aria-labelledby="features-heading">
      <p className="ld-label">Features</p>
      <h2 id="features-heading" className="ld-title">
        Everything a bookkeeper needs. Nothing they don&rsquo;t.
      </h2>
      <ul className="ld-features__grid" role="list">
        {FEATURES.map((f) => (
          <li key={f.title} className="ld-feature-card">
            <p className="ld-feature-card__icon" aria-hidden="true">{f.icon}</p>
            <p className="ld-feature-card__title">{f.title}</p>
            <p className="ld-feature-card__desc">{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
