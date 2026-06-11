'use client'
import { useState } from 'react'
import { FAQS } from '@/lib/faq-data'

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
