// src/components/landing/FAQSection.tsx
const FAQS = [
  {
    q: 'Do my clients need to download an app?',
    a: 'No. Sofia Books is fully web-based. Clients upload receipts from any phone browser — no app install needed.',
  },
  {
    q: 'Can I manage multiple SME clients from one account?',
    a: 'Yes. Your firm gets one account. You can create unlimited client workspaces and assign accountants to specific clients.',
  },
  {
    q: 'Is it BIR-compliant?',
    a: 'Yes. The system generates CRB, CDB, General Journal, and General Ledger formatted for loose-leaf BIR submission. VAT computation follows BIR rules.',
  },
  {
    q: 'What if the AI misclassifies a transaction?',
    a: 'Nothing posts to the books without your approval. Low-confidence items are flagged yellow so you can correct them before they go through.',
  },
  {
    q: 'Can clients see what the accountant is doing?',
    a: 'Clients see only their own uploaded documents and approved reports. They cannot see pending reviews, other clients, or the approval queue.',
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="ld-section" aria-labelledby="faq-heading">
      <p className="ld-label">FAQ</p>
      <h2 id="faq-heading" className="ld-title">Common questions</h2>
      <dl className="ld-faq__list">
        {FAQS.map(({ q, a }) => (
          <div key={q} className="ld-faq__item">
            <dt className="ld-faq__q">{q}</dt>
            <dd className="ld-faq__a">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
