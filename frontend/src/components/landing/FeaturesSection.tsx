// src/components/landing/FeaturesSection.tsx
const FEATURES = [
  { icon: '🚦', title: 'Red / Yellow / Green queue',  desc: 'Anomalies surface automatically. Green items batch-approve in one click. Red items require individual review.' },
  { icon: '🧾', title: '4 BIR books in one click',    desc: 'CRB, CDB, General Journal, and General Ledger — formatted for loose-leaf BIR submission.' },
  { icon: '💸', title: 'VAT auto-computation',         desc: '12% VAT split for VAT-registered clients. Full-amount posting for Non-VAT clients.' },
  { icon: '📊', title: 'Multi-client dashboard',       desc: 'All your clients in one screen. See who has anomalies or pending items before month-end hits.' },
  { icon: '🔁', title: 'Adjusting entries',            desc: 'Reclassify, reverse, or add entries with a full permanent audit trail.' },
  { icon: '📱', title: 'Mobile-first upload',          desc: 'Clients upload from any phone browser — no app install. GCash screenshots accepted.' },
]

const BIR_BOOKS = [
  'Cash Receipts Book',
  'Cash Disbursements Book',
  'General Journal',
  'General Ledger',
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

      <div className="ld-bir-callout" aria-label="BIR books generated">
        <div className="ld-bir-callout__copy">
          <p className="ld-bir-callout__title">BIR-ready books, always</p>
          <p className="ld-bir-callout__desc">
            Every approved transaction automatically flows into the four required
            books of accounts. Formatted for loose-leaf printing and BIR submission.
          </p>
        </div>
        <ul className="ld-bir-callout__chips" role="list">
          {BIR_BOOKS.map((b) => (
            <li key={b} className="ld-bir-callout__chip">{b}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
