// src/components/landing/BIRSection.tsx
const BIR_BOOKS = [
  'Cash Receipts Book',
  'Cash Disbursements Book',
  'General Journal',
  'General Ledger',
]

export function BIRSection() {
  return (
    <section id="bir" className="ld-section ld-section--alt" aria-labelledby="bir-heading">
      <p className="ld-label">BIR Compliance</p>
      <h2 id="bir-heading" className="ld-title">BIR-ready books, always</h2>
      <p className="ld-sub">
        Every approved transaction automatically flows into the four required books of
        accounts. Formatted for loose-leaf printing and BIR submission — no manual
        reformatting needed.
      </p>
      <ul className="ld-bir__books" role="list" aria-label="BIR books generated">
        {BIR_BOOKS.map((b) => (
          <li key={b} className="ld-bir__badge">{b}</li>
        ))}
      </ul>
      <p className="ld-bir__note">
        Also handles <strong>VAT computation</strong> (12% Input/Output VAT for
        VAT-registered clients), <strong>percentage tax</strong> posting for Non-VAT
        clients, and <strong>past-period flagging</strong> when transactions are posted
        late.
      </p>
    </section>
  )
}
