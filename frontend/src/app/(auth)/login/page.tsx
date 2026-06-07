'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import PugMascot from '@/components/login/PugMascot'
import axios from 'axios'

type Mascot = 'sofia' | 'yoda'
type Focus  = 'email' | 'password' | null
type Status = 'idle' | 'loading' | 'success'

const THEME = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [mascot, setMascot] = useState<Mascot>('sofia')
  const [focus,  setFocus]  = useState<Focus>(null)
  const [showPw, setShowPw] = useState(false)
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState<string | null>(null)

  // Restore saved mascot choice (client-side only — avoids SSR hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('sofia_login_theme')
    if (stored === 'sofia' || stored === 'yoda') setMascot(stored)
  }, [])

  // Apply theme class to body so the night mode covers the full viewport
  useEffect(() => {
    document.body.classList.remove('theme-sofia', 'theme-yoda')
    document.body.classList.add('theme-' + mascot)
    localStorage.setItem('sofia_login_theme', mascot)
    localStorage.setItem('sofia_theme', mascot)
    return () => { document.body.classList.remove('theme-sofia', 'theme-yoda') }
  }, [mascot])

  const peeking = focus === 'password' && !showPw
  const happy   = status === 'success'
  const t       = THEME[mascot]
  const name    = mascot === 'sofia' ? 'Sofia' : 'Yoda'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'idle') return
    setError(null)
    setStatus('loading')
    try {
      const user = await login(email, pw)
      setStatus('success')
      setTimeout(() => router.push(`/${user.role}/dashboard`), 1500)
    } catch (err) {
      setStatus('idle')
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        router.push('/blocked')
      } else {
        setError('Invalid credentials. Please check your details and try again.')
      }
    }
  }

  return (
    <div className="lv2-shell">

      {/* ── Left: form pane ── */}
      <section className="lv2-pane lv2-form-pane">
        <header className="lv2-brand">
          <span className="lv2-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21">
              <circle cx="12" cy="14.6" r="5.1" fill="#fff" />
              <circle cx="6.4" cy="8.6"  r="2.25" fill="#fff" />
              <circle cx="12" cy="6.1"   r="2.25" fill="#fff" />
              <circle cx="17.6" cy="8.6" r="2.25" fill="#fff" />
            </svg>
          </span>
          <span className="lv2-brand-name">Built for Bookkeepers</span>
        </header>

        <div className="lv2-form-wrap">
          <h1 className="lv2-headline">Welcome back</h1>
          <p className="lv2-subhead">Sign in to your workspace to continue.</p>

          {error && (
            <div className="lv2-error" role="alert">
              <AlertCircle size={16} className="lv2-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className="lv2-field">
              <label className="lv2-label" htmlFor="lv2-id">
                Email, mobile, or username
              </label>
              <div className={`lv2-input${focus === 'email' ? ' is-focus' : ''}`}>
                <User size={18} className="lv2-input-ic" aria-hidden="true" />
                <input
                  id="lv2-id"
                  type="text"
                  autoComplete="username"
                  placeholder="you@firm.ph"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  onFocus={() => setFocus('email')}
                  onBlur={() => setFocus(null)}
                />
              </div>
              <p className="lv2-hint">Any of your registered identifiers.</p>
            </div>

            {/* Password */}
            <div className="lv2-field">
              <div className="lv2-label-row">
                <label className="lv2-label" htmlFor="lv2-pw">Password</label>
                <a className="lv2-forgot" href="#">Forgot?</a>
              </div>
              <div className={`lv2-input${focus === 'password' ? ' is-focus' : ''}`}>
                <Lock size={18} className="lv2-input-ic" aria-hidden="true" />
                <input
                  id="lv2-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(null) }}
                  onFocus={() => setFocus('password')}
                  onBlur={() => setFocus(null)}
                />
                <button
                  type="button"
                  className="lv2-reveal"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label="Toggle password"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`lv2-submit ${status}`}
              disabled={status !== 'idle'}
            >
              {status === 'idle'    && 'Sign in'}
              {status === 'loading' && 'Signing in…'}
              {status === 'success' && 'Welcome back!'}
            </button>
          </form>

          <p className="lv2-reset">
            Need access?{' '}
            <a href="#">Ask your firm admin to invite you.</a>
          </p>
        </div>

        <footer className="lv2-legal">
          Built for Bookkeepers &middot; AI bookkeeping for Philippine firms
        </footer>
      </section>

      {/* ── Right: art pane ── */}
      <section className="lv2-pane lv2-art-pane">
        <div className="lv2-blob lv2-b1" />
        <div className="lv2-blob lv2-b2" />
        <div className="lv2-grid-dots" />

        <div
          className="lv2-mascot-toggle"
          role="tablist"
          aria-label="Choose your AI assistant"
        >
          <span className={`lv2-toggle-thumb ${mascot}`} />
          <button
            role="tab"
            aria-selected={mascot === 'sofia'}
            className={mascot === 'sofia' ? 'on' : ''}
            onClick={() => setMascot('sofia')}
          >
            Sofia
          </button>
          <button
            role="tab"
            aria-selected={mascot === 'yoda'}
            className={mascot === 'yoda' ? 'on' : ''}
            onClick={() => setMascot('yoda')}
          >
            Yoda
          </button>
        </div>

        <div className="lv2-art-inner">
          <div className={`lv2-pug-float${happy ? ' is-happy' : ''}`}>
            <PugMascot
              variant={mascot}
              accent={t.accent}
              accentGlow={t.accentGlow}
              peeking={peeking}
              happy={happy}
            />
          </div>

          <div className="lv2-art-copy">
            <h2 className="lv2-art-title">
              An AI co-pilot for<br />your clients&rsquo; books.
            </h2>
            <p className="lv2-art-sub">
              Upload your clients&rsquo; receipts yourself, or invite clients to upload
              their own &mdash; {name} categorizes everything with AI, and you stay
              the approver.
            </p>
            <ul className="lv2-chips">
              <li className="lv2-chip">
                <span className="lv2-chip-dot d1" />
                Upload yourself or invite clients
              </li>
              <li className="lv2-chip">
                <span className="lv2-chip-dot d2" />
                AI-categorized entries
              </li>
              <li className="lv2-chip">
                <span className="lv2-chip-dot d3" />
                You approve every account
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  )
}
