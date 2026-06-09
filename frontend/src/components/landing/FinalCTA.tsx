// src/components/landing/FinalCTA.tsx
import PugMascot from '@/components/login/PugMascot'

// ← Replace these before going live
const CONTACT_EMAIL  = 'hello@sofiabooks.ph'
const VIBER_NUMBER   = '09XXXXXXXXX'   // replace with real number

export function FinalCTA() {
  return (
    <section id="cta" className="ld-cta" aria-labelledby="cta-heading">
      <h2 id="cta-heading" className="ld-cta__h2">
        Ready to take on more clients?
      </h2>
      <p className="ld-cta__sub">
        Reach out and we&rsquo;ll get your firm set up. ₱999/month, everything included.
      </p>
      <div className="ld-cta__btns">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="ld-cta__btn-email"
        >
          ✉️ Email us
        </a>
        <a
          href={`viber://chat?number=%2B63${VIBER_NUMBER.replace(/^0/, '')}`}
          className="ld-cta__btn-viber"
        >
          💬 Message on Viber
        </a>
      </div>
      <div className="ld-cta__pug" aria-hidden="true">
        <PugMascot
          variant="sofia"
          accent="rgba(255,255,255,0.5)"
          accentGlow="rgba(255,255,255,0.3)"
          peeking={false}
          happy={true}
          size={96}
        />
      </div>
    </section>
  )
}
