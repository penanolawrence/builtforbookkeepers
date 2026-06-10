'use client'
import { useState } from 'react'

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
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="ld-section" aria-labelledby="faq-heading">
      <p className="ld-label">FAQ</p>
      <h2 id="faq-heading" className="ld-title">Common questions</h2>
      <ul className="ld-faq__list" role="list">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = openIndex === i
          return (
            <li key={q} className={`ld-faq__item${isOpen ? ' ld-faq__item--open' : ''}`}>
              <button
                className="ld-faq__btn"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="ld-faq__q">{q}</span>
                <svg className="ld-faq__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="ld-faq__body" aria-hidden={!isOpen}>
                <p className="ld-faq__a">{a}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
