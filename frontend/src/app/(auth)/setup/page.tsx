'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Lock, AlertCircle } from 'lucide-react'
import { validateSetupToken, setupPassword } from '@/lib/api/auth'
import PugMascot from '@/components/login/PugMascot'
import type { Role } from '@/types/auth'
import axios from 'axios'

// ── Validation ────────────────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(2, 'Full name required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(pw: string): { level: 'weak' | 'ok' | 'strong'; bars: number } | null {
  if (!pw) return null
  const variety = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  if (pw.length < 8 || variety < 2) return { level: 'weak', bars: 1 }
  if (pw.length >= 12 && variety >= 3) return { level: 'strong', bars: 3 }
  return { level: 'ok', bars: 2 }
}

const strengthFill  = { weak: 'filled-weak', ok: 'filled-ok', strong: 'filled-strong' }
const strengthLabel = { weak: 'Weak', ok: 'Fair', strong: 'Strong' }

// ── Types ─────────────────────────────────────────────────────────────────────

type Mascot       = 'sofia' | 'yoda'
type Focus        = 'password' | 'confirm' | null
type TokenState   = 'loading' | 'invalid' | 'expired' | 'form'
type SubmitStatus = 'idle' | 'success'

const THEME = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

// ── SetupForm (needs useSearchParams → must be inside Suspense) ───────────────

function SetupForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')

  // Token state
  const [tokenState, setTokenState] = useState<TokenState>('loading')
  const [role,       setRole]       = useState<Role | null>(null)
  const [apiError,   setApiError]   = useState<string | null>(null)

  // Mascot + theme state
  const [mascot,       setMascot]       = useState<Mascot>('sofia')
  const [focus,        setFocus]        = useState<Focus>(null)
  const [showPw,       setShowPw]       = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { onBlur: pwBlur,      ...pwReg      } = register('password')
  const { onBlur: confirmBlur, ...confirmReg } = register('confirmPassword')

  const pwValue  = watch('password', '')
  const strength = getStrength(pwValue)
  const peeking  = (focus === 'password' && !showPw) || (focus === 'confirm' && !showConfirm)
  const happy    = submitStatus === 'success'
  const t        = THEME[mascot]
  const name     = mascot === 'sofia' ? 'Sofia' : 'Yoda'

  // Restore saved mascot choice
  useEffect(() => {
    const stored = localStorage.getItem('sofia_login_theme')
    if (stored === 'sofia' || stored === 'yoda') setMascot(stored)
  }, [])

  // Apply theme class to body
  useEffect(() => {
    document.body.classList.remove('theme-sofia', 'theme-yoda')
    document.body.classList.add('theme-' + mascot)
    localStorage.setItem('sofia_login_theme', mascot)
    localStorage.setItem('sofia_theme', mascot)
    return () => { document.body.classList.remove('theme-sofia', 'theme-yoda') }
  }, [mascot])

  // Validate token on mount
  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    validateSetupToken(token)
      .then((result) => {
        if (!result.valid)       setTokenState('invalid')
        else if (result.expired) setTokenState('expired')
        else { setRole(result.role); setTokenState('form') }
      })
      .catch(() => setTokenState('invalid'))
  }, [token, router])

  // Cancel redirect timer on unmount
  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current) }
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (!token) return
    setApiError(null)
    try {
      const { user } = await setupPassword(token, values.name, values.password)
      setSubmitStatus('success')
      redirectTimer.current = setTimeout(() => router.push(`/${user.role}/dashboard`), 1500)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setApiError(err.response.data?.message ?? 'Invalid data.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    }
  }

  const isClient = role === 'client'
  const subtitle = isClient
    ? 'Welcome! Set your name and a password to get started.'
    : 'Welcome to Built for Bookkeepers. Set your name and choose a password.'

  // ── Left pane content ───────────────────────────────────────────────────────

  let leftContent: React.ReactNode

  if (tokenState === 'loading') {
    leftContent = (
      <div className="lv2-form-wrap">
        <div className="state-center">
          <div className="spinner-lg" />
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Validating your invite link…</div>
        </div>
      </div>
    )
  } else if (tokenState === 'invalid') {
    leftContent = (
      <div className="lv2-form-wrap">
        <div className="state-center">
          <div className="state-icon">🔗</div>
          <div className="state-title">This link is invalid</div>
          <div className="state-body">
            This invite link has already been used or does not exist.
            Contact your admin to generate a new one.
          </div>
        </div>
      </div>
    )
  } else if (tokenState === 'expired') {
    leftContent = (
      <div className="lv2-form-wrap">
        <div className="state-center">
          <div className="state-icon">⏰</div>
          <div className="state-title">This link has expired</div>
          <div className="state-body">
            Invite links are valid for 30 days. This one has expired.
            Contact your admin to get a fresh link.
          </div>
        </div>
      </div>
    )
  } else {
    leftContent = (
      <div className="lv2-form-wrap">
        {role && (
          <div style={{ marginBottom: 12 }}>
            {isClient
              ? <span className="role-chip-client">● Client</span>
              : <span className="role-chip-accountant">● Accountant</span>
            }
          </div>
        )}

        <h1 className="lv2-headline">Set up your account</h1>
        <p className="lv2-subhead">{subtitle}</p>

        {apiError && (
          <div className="lv2-error" role="alert">
            <AlertCircle size={16} className="lv2-error-icon" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Full Name */}
          <div className="lv2-field">
            <label className="lv2-label" htmlFor="su-name">
              Full Name <span className="form-req">*</span>
            </label>
            <div className="lv2-input">
              <User size={18} className="lv2-input-ic" aria-hidden="true" />
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                disabled={isSubmitting || submitStatus === 'success'}
                {...register('name')}
              />
            </div>
            {errors.name
              ? <div className="field-error">{errors.name.message}</div>
              : <p className="lv2-hint">How you&apos;ll appear in the system</p>
            }
          </div>

          {/* New Password */}
          <div className="lv2-field">
            <label className="lv2-label" htmlFor="su-pw">
              New Password <span className="form-req">*</span>
            </label>
            <div className={`lv2-input${focus === 'password' ? ' is-focus' : ''}`}>
              <Lock size={18} className="lv2-input-ic" aria-hidden="true" />
              <input
                id="su-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                disabled={isSubmitting || submitStatus === 'success'}
                onFocus={() => setFocus('password')}
                onBlur={(e) => { setFocus(null); pwBlur(e) }}
                {...pwReg}
              />
              <button
                type="button"
                className="lv2-reveal"
                onClick={() => setShowPw((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {strength && (
              <div className="pw-strength">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`pw-bar${n <= strength.bars ? ` ${strengthFill[strength.level]}` : ''}`}
                  />
                ))}
                <span className={`pw-label ${strength.level}`}>
                  {strengthLabel[strength.level]}
                </span>
              </div>
            )}
            {errors.password && <div className="field-error">{errors.password.message}</div>}
          </div>

          {/* Confirm Password */}
          <div className="lv2-field">
            <label className="lv2-label" htmlFor="su-confirm">
              Confirm Password <span className="form-req">*</span>
            </label>
            <div className={`lv2-input${focus === 'confirm' ? ' is-focus' : ''}`}>
              <Lock size={18} className="lv2-input-ic" aria-hidden="true" />
              <input
                id="su-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                disabled={isSubmitting || submitStatus === 'success'}
                onFocus={() => setFocus('confirm')}
                onBlur={(e) => { setFocus(null); confirmBlur(e) }}
                {...confirmReg}
              />
              <button
                type="button"
                className="lv2-reveal"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword.message}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || submitStatus === 'success'}
            className={`lv2-submit${isSubmitting ? ' loading' : submitStatus === 'success' ? ' success' : ''}`}
          >
            {isSubmitting
              ? 'Setting up…'
              : submitStatus === 'success'
              ? "You're all set!"
              : 'Create Account & Sign In'}
          </button>
        </form>
      </div>
    )
  }

  // ── Shell ───────────────────────────────────────────────────────────────────

  return (
    <div className="lv2-shell">

      {/* Left: form pane */}
      <section className="lv2-pane lv2-form-pane">
        <header className="lv2-brand">
          <span className="lv2-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21">
              <circle cx="12" cy="14.6" r="5.1"  fill="#fff" />
              <circle cx="6.4"  cy="8.6"  r="2.25" fill="#fff" />
              <circle cx="12"   cy="6.1"  r="2.25" fill="#fff" />
              <circle cx="17.6" cy="8.6"  r="2.25" fill="#fff" />
            </svg>
          </span>
          <span className="lv2-brand-name">Built for Bookkeepers</span>
        </header>

        {leftContent}

        <footer className="lv2-legal">
          By continuing, you agree to the{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </footer>
      </section>

      {/* Right: art pane — identical to login */}
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

// ── Page (Suspense boundary for useSearchParams) ──────────────────────────────

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="lv2-shell">
        <section className="lv2-pane lv2-form-pane">
          <div className="lv2-form-wrap">
            <div className="state-center">
              <div className="spinner-lg" />
            </div>
          </div>
        </section>
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
