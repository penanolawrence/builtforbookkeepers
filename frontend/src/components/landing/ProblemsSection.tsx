// src/components/landing/ProblemsSection.tsx
const PROBLEMS = [
  {
    icon: '📱',
    title: 'Receipts arrive via Viber at midnight',
    desc: 'SME owners forward GCash screenshots and receipt photos from their phone. By month-end, dozens are missing or faded.',
    solve: '→ Mobile upload page + duplicate detection',
  },
  {
    icon: '📋',
    title: 'BIR books take a whole day to prepare',
    desc: 'CRB, CDB, General Journal, General Ledger — formatted for loose-leaf binding and BIR submission. Usually done the night before the deadline.',
    solve: '→ Generated in one click, anytime',
  },
  {
    icon: '👥',
    title: 'Managing 10+ clients means 10+ Excel files',
    desc: 'No unified view of which client has anomalies or pending items. Month-end crunch means everything arrives at once with no prioritization.',
    solve: '→ Multi-client dashboard + anomaly queue',
  },
  {
    icon: '⚠️',
    title: 'BIR compliance is confusing and risky',
    desc: 'Wrong VAT computation or missing entries can mean penalties starting at ₱1,000 per violation.',
    solve: '→ Auto VAT computation + BIR-formatted books',
  },
]

export function ProblemsSection() {
  return (
    <section id="problems" className="ld-section" aria-labelledby="problems-heading">
      <p className="ld-label">Problems we solve</p>
      <h2 id="problems-heading" className="ld-title">
        Built for how Philippine bookkeeping actually works
      </h2>
      <p className="ld-sub">
        Not a Western SaaS tool retrofitted for the Philippines — built from the ground
        up for BIR, GCash, and Viber-forwarded receipts.
      </p>
      <ul className="ld-problems__grid" role="list">
        {PROBLEMS.map((p) => (
          <li key={p.title} className="ld-problem-card">
            <span className="ld-problem-card__icon" aria-hidden="true">{p.icon}</span>
            <div>
              <p className="ld-problem-card__title">{p.title}</p>
              <p className="ld-problem-card__desc">{p.desc}</p>
              <p className="ld-problem-card__solve">{p.solve}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
