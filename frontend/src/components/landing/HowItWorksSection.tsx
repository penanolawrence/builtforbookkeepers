// src/components/landing/HowItWorksSection.tsx
const STEPS = [
  {
    title: 'Receipts come in — from client or accountant',
    desc: 'Clients snap and send from any phone browser — no app needed. Or you upload on their behalf. GCash screenshots, Viber photos, and bank PDFs all accepted.',
    aiChip: false,
  },
  {
    title: 'Sofia classifies and flags',
    desc: 'AI assigns categories, detects anomalies — duplicates, VAT mismatches, spending spikes — and sorts everything into a Red / Yellow / Green queue.',
    aiChip: true,
  },
  {
    title: 'You review and export',
    desc: 'Batch-approve green items in one click. Fix flagged items individually. Generate BIR books formatted for loose-leaf submission — instantly.',
    aiChip: false,
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="ld-section ld-section--alt" aria-labelledby="hiw-heading">
      <p className="ld-label">How it works</p>
      <h2 id="hiw-heading" className="ld-title">From receipt to BIR book in three steps</h2>
      <p className="ld-sub">
        No manual data entry. No spreadsheet gymnastics. Receipts in, BIR books out.
      </p>
      <ol className="ld-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`ld-step${s.aiChip ? ' ld-step--ai' : ''}`}>
            <div className="ld-step__num" aria-hidden="true">
              {i + 1}
              {s.aiChip && <span className="ld-step__ai-badge">• AI</span>}
            </div>
            <h3 className="ld-step__title">{s.title}</h3>
            <p className="ld-step__desc">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
