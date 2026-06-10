// src/components/landing/HowItWorksSection.tsx
const STEPS = [
  {
    title: 'Client uploads receipts',
    desc: 'From any phone browser — no app needed. Income and expense areas are clearly separated. GCash screenshots and Viber photos accepted.',
    aiChip: false,
  },
  {
    title: 'Sofia classifies and flags',
    desc: 'AI assigns categories, detects anomalies (duplicate receipts, VAT mismatches, spending spikes), and sorts items into a Red / Yellow / Green review queue.',
    aiChip: true,
  },
  {
    title: 'You review, approve, and export',
    desc: 'Batch-approve green items in one click. Red and yellow items get individual attention. Generate any BIR book instantly — formatted for loose-leaf submission.',
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
          <li key={s.title} className="ld-step">
            <div className="ld-step__num" aria-hidden="true">
              {i + 1}
              {i < STEPS.length - 1 && <div className="ld-step__line" />}
            </div>
            <div>
              <p className="ld-step__title">
                {s.title}
                {s.aiChip && <span className="ld-step__ai-chip">• AI</span>}
              </p>
              <p className="ld-step__desc">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
