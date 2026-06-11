'use client'

// src/components/landing/FinalCTA.tsx
import { useState } from 'react'
import PugMascot from '@/components/login/PugMascot'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export function FinalCTA() {
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ contact, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="cta" className="ld-cta" aria-labelledby="cta-heading">
      <div className="ld-cta__pug" aria-hidden="true">
        <PugMascot
          variant="sofia"
          accent="#E2568C"
          accentGlow="#F2A0C0"
          peeking={false}
          happy={true}
          size={90}
        />
      </div>
      {status === 'success' ? (
        <div className="ld-cta__success">
          <p className="ld-cta__success-icon">🎉</p>
          <h2 className="ld-cta__h2">We&rsquo;ll be in touch!</h2>
          <p className="ld-cta__sub">Thanks for reaching out. We&rsquo;ll get back to you within one business day.</p>
        </div>
      ) : (
        <>
          <h2 id="cta-heading" className="ld-cta__h2">Ready to take on<br />more clients?</h2>
          <p className="ld-cta__sub">Leave your details and we&rsquo;ll get your firm set up. ₱999/month, everything included.</p>
          <form className="ld-cta__form" onSubmit={handleSubmit} noValidate>
            <input
              className="ld-cta__input"
              type="text"
              placeholder="Email or phone number"
              value={contact}
              onChange={e => setContact(e.target.value)}
              required
              aria-label="Email or phone number"
            />
            <textarea
              className="ld-cta__textarea"
              placeholder="Any questions or concerns? (optional)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              aria-label="Questions or concerns"
            />
            {status === 'error' && (
              <p className="ld-cta__error">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              className="ld-cta__submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending…' : 'Get started →'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}
