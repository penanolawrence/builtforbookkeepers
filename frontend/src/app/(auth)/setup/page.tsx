'use client'

import { useEffect, useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateSetupToken, setupPassword } from '@/lib/api/auth'
import type { Role } from '@/types/auth'
import axios from 'axios'

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
type State = 'loading' | 'invalid' | 'expired' | 'form'

function getStrength(pw: string): { level: 'weak' | 'ok' | 'strong'; bars: number } | null {
  if (!pw) return null
  const variety = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  if (pw.length < 8 || variety < 2) return { level: 'weak', bars: 1 }
  if (pw.length >= 12 && variety >= 3) return { level: 'strong', bars: 3 }
  return { level: 'ok', bars: 2 }
}

const strengthFill = { weak: 'filled-weak', ok: 'filled-ok', strong: 'filled-strong' }
const strengthLabel = { weak: 'Weak', ok: 'Fair', strong: 'Strong' }

function Logo() {
  return (
    <div className="auth-logo">
      <div className="auth-logo-dot" />
      <div className="auth-logo-name">Built for Bookkeepers</div>
    </div>
  )
}

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState<State>('loading')
  const [role, setRole] = useState<Role | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const pwValue = watch('password', '')
  const strength = getStrength(pwValue)

  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    validateSetupToken(token)
      .then((result) => {
        if (!result.valid) setState('invalid')
        else if (result.expired) setState('expired')
        else { setRole(result.role); setState('form') }
      })
      .catch(() => setState('invalid'))
  }, [token, router])

  const onSubmit = async (values: FormValues) => {
    if (!token) return
    setApiError(null)
    try {
      const { user } = await setupPassword(token, values.name, values.password)
      router.push(`/${user.role}/dashboard`)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setApiError(err.response.data?.message ?? 'Invalid data.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    }
  }

  if (state === 'loading') {
    return (
      <div className="auth-bg">
        <Logo />
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-title">Set up your account</div>
          </div>
          <div className="auth-card-body">
            <div className="state-center">
              <div className="spinner-lg" />
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Validating your invite link…</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="auth-bg">
        <Logo />
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-title">Set up your account</div>
          </div>
          <div className="auth-card-body">
            <div className="state-center">
              <div className="state-icon">🔗</div>
              <div className="state-title">This link is invalid</div>
              <div className="state-body">This invite link has already been used or does not exist. Contact your admin to generate a new one.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="auth-bg">
        <Logo />
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-title">Set up your account</div>
          </div>
          <div className="auth-card-body">
            <div className="state-center">
              <div className="state-icon">⏰</div>
              <div className="state-title">This link has expired</div>
              <div className="state-body">Invite links are valid for 30 days. This one has expired. Contact your admin to get a fresh link.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isClient = role === 'client'
  const subtitle = isClient
    ? 'Welcome! Set your name and a password to get started.'
    : 'Welcome to Built for Bookkeepers. Set your name and choose a password.'

  return (
    <div className="auth-bg">
      <Logo />
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-title">Set up your account</div>
          <div className="auth-card-subtitle">
            {subtitle}
            {role && (
              <div style={{ marginTop: 10 }}>
                {isClient
                  ? <span className="role-chip-client">👤 Client</span>
                  : <span className="role-chip-accountant">🧾 Accountant</span>
                }
              </div>
            )}
          </div>
        </div>

        <div className="auth-card-body">
          {apiError && (
            <div className="alert-error">
              <span className="alert-icon">✕</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-field">
              <label className="form-label">
                Full Name <span className="form-req">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                className={`form-input no-icon${errors.name ? ' error' : ''}`}
                {...register('name')}
              />
              {errors.name
                ? <div className="field-error">{errors.name.message}</div>
                : <div className="form-hint">How you&apos;ll appear in the system</div>
              }
            </div>

            <div className="form-field">
              <label className="form-label">
                New Password <span className="form-req">*</span>
              </label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                disabled={isSubmitting}
                className={`form-input no-icon${errors.password ? ' error' : ''}`}
                {...register('password')}
              />
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

            <div className="form-field">
              <label className="form-label">
                Confirm Password <span className="form-req">*</span>
              </label>
              <input
                type="password"
                disabled={isSubmitting}
                className={`form-input no-icon${errors.confirmPassword ? ' error' : ''}`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <div className="field-error">{errors.confirmPassword.message}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-full btn-primary-full${isSubmitting ? ' btn-loading' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-inline" />
                  Setting up…
                </>
              ) : 'Create Account & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="auth-bg">
        <div className="spinner-lg" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
