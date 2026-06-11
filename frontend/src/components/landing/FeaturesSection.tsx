// src/components/landing/FeaturesSection.tsx
import type { ReactNode } from 'react'

const FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none"/>
      </svg>
    ),
    title: 'Red / Yellow / Green queue',
    desc: 'Anomalies surface automatically. Green items batch-approve in one click. Red items require individual review.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    title: '4 BIR books in one click',
    desc: 'CRB, CDB, General Journal, and General Ledger — formatted for loose-leaf BIR submission, generated on demand.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="5" x2="5" y2="19"/>
        <circle cx="6.5" cy="6.5" r="2.5"/>
        <circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>
    ),
    title: 'VAT auto-computation',
    desc: '12% VAT split for VAT-registered clients. Full-amount posting for Non-VAT. No manual calculation.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    title: 'Multi-client dashboard',
    desc: 'All your clients in one view. See who has anomalies or pending items before month-end hits.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
      </svg>
    ),
    title: 'Adjusting entries',
    desc: 'Reclassify, reverse, or add entries with a full permanent audit trail that stands up to scrutiny.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Mobile-first upload',
    desc: 'Clients upload from any phone browser — no app install. GCash screenshots and Viber photos accepted.',
  },
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
            <div className="ld-feature-card__icon" aria-hidden="true">{f.icon}</div>
            <p className="ld-feature-card__title">{f.title}</p>
            <p className="ld-feature-card__desc">{f.desc}</p>
          </li>
        ))}
      </ul>

      <div className="ld-bir-callout" aria-label="BIR books generated">
        <div className="ld-bir-callout__copy">
          <p className="ld-bir-callout__title">BIR-ready books, always</p>
          <p className="ld-bir-callout__desc">
            Every approved transaction automatically flows into all four required
            books — formatted for loose-leaf printing and BIR submission. No reformatting needed.
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
