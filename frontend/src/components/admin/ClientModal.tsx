'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  createClient,
} from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { ClientDetailModal } from '@/components/clients/ClientDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientModalProps =
  | { mode: 'create'; onClose: () => void; onCreated?: (clientId: string) => void }
  | { mode: 'detail'; clientId: string; onClose: () => void }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  businessName: z.string().min(1, 'Required'),
  mobile:       z.string().min(1, 'Required'),
  planType:     z.enum(['starter', 'growth', 'premium']),
  birType:      z.enum(['vat', 'non_vat']),
  accountantId: z.string().min(1, 'Required'),
  tin:          z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  industryType: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const INDUSTRY_OPTIONS = [
  { value: 'retail',                label: 'Retail' },
  { value: 'services',              label: 'Services' },
  { value: 'restaurant',            label: 'Restaurant / F&B' },
  { value: 'construction',          label: 'Construction' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'manufacturing',         label: 'Manufacturing' },
]

// ─── CreateMode ───────────────────────────────────────────────────────────────

interface SuccessData { companyId: string; inviteLink: string; username: string; email?: string }

function CreateMode({ onClose, onCreated }: { onClose: () => void; onCreated?: (clientId: string) => void }) {
  const [success, setSuccess]         = useState<SuccessData | null>(null)
  const [copied, setCopied]           = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn:  getAccountants,
  })

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { planType: 'starter', birType: 'non_vat' },
  })

  const onSubmit = async (data: CreateForm) => {
    setSubmitError(null)
    try {
      const result = await createClient(data)
      setSuccess({ ...result, email: data.email || undefined })
    } catch {
      setSubmitError('Failed to create client. Please try again.')
    }
  }

  const copyLink = () => {
    if (success) {
      navigator.clipboard.writeText(success.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const inputCls = (hasError = false) =>
    `w-full border rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card outline-none focus:ring-2 focus:ring-t-primary/30 ${
      hasError ? 'border-red-400' : 'border-t-line'
    }`

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-[rgba(42,28,60,0.45)]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex flex-col"
          style={{ width: 460, maxHeight: '90vh', background: 'var(--t-card)', borderRadius: 14, boxShadow: '0 8px 60px rgba(42,28,60,.22)', overflow: 'hidden' }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--t-line)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--t-ink)' }}>
                New Client
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 3 }}>
                Fill in the details below to register a new client.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--t-surface)', cursor: 'pointer', color: 'var(--t-muted)', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {success ? (
              /* ── Success screen ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--t-tier-ready-bg)', border: '2px solid var(--t-tier-ready-ring)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                  ✓
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t-ink)' }}>Client created!</div>
                  <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 4 }}>
                    Login username: <strong style={{ color: 'var(--t-ink)' }}>{success.username}</strong>
                  </div>
                </div>

                <div style={{ width: '100%', background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 8 }}>
                    Invite Link
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t-ink)', wordBreak: 'break-all', marginBottom: 10 }}>
                    {success.inviteLink}
                  </div>
                  <button
                    onClick={copyLink}
                    style={{ width: '100%', padding: '8px', borderRadius: 7, border: '1px solid var(--t-line)', background: copied ? 'var(--t-tier-ready-bg)' : 'var(--t-card)', color: copied ? 'var(--t-tier-ready-fg)' : 'var(--t-ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {copied ? '✓ Copied!' : 'Copy Invite Link'}
                  </button>
                </div>

                {success.email ? (
                  <div style={{ fontSize: 11.5, color: 'var(--t-muted)' }}>
                    Invite email sent to <strong>{success.email}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--t-muted)' }}>
                    No email provided — share the link manually.
                  </div>
                )}
              </div>
            ) : (
              /* ── Form ── */
              <form id="create-client-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Business Name <span style={{ color: 'red' }}>*</span></label>
                  <input {...register('businessName')} className={inputCls(!!errors.businessName)} placeholder="ABC Trading Corp." />
                  {errors.businessName && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.businessName.message}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Mobile <span style={{ color: 'red' }}>*</span></label>
                  <input {...register('mobile')} className={inputCls(!!errors.mobile)} placeholder="09XX XXX XXXX" />
                  {errors.mobile && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.mobile.message}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>TIN</label>
                  <input {...register('tin')} className={inputCls()} placeholder="000-000-000" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Plan <span style={{ color: 'red' }}>*</span></label>
                  <select value={watch('planType')} onChange={(e) => setValue('planType', e.target.value as 'starter' | 'growth' | 'premium')} className={inputCls()}>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>VAT Type <span style={{ color: 'red' }}>*</span></label>
                  <select value={watch('birType')} onChange={(e) => setValue('birType', e.target.value as 'vat' | 'non_vat')} className={inputCls()}>
                    <option value="non_vat">Non-VAT</option>
                    <option value="vat">VAT</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Industry Type</label>
                  <select
                    value={watch('industryType') ?? ''}
                    onChange={(e) => setValue('industryType', e.target.value || undefined)}
                    className={inputCls()}
                  >
                    <option value="">Select industry… (optional)</option>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10.5, color: 'var(--t-faint)', marginTop: 3 }}>
                    Client can also set this during account setup.
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Email</label>
                  <input type="email" {...register('email')} className={inputCls(!!errors.email)} placeholder="client@email.com" />
                  {errors.email && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.email.message}</div>}
                  <div style={{ fontSize: 10.5, color: 'var(--t-faint)', marginTop: 3 }}>Invite email will be sent automatically if provided.</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Contact Person</label>
                  <input {...register('contactPerson')} className={inputCls()} placeholder="Juan dela Cruz" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Accountant <span style={{ color: 'red' }}>*</span></label>
                  <select value={watch('accountantId') ?? ''} onChange={(e) => setValue('accountantId', e.target.value)} className={inputCls(!!errors.accountantId)}>
                    <option value="">Select accountant…</option>
                    {(accountants ?? []).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.accountantId && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.accountantId.message}</div>}
                </div>

                {submitError && <div style={{ gridColumn: '1 / -1', fontSize: 10.5, color: 'red' }}>{submitError}</div>}
              </form>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--t-line)', display: 'flex', gap: 10, flexShrink: 0 }}>
            {success ? (
              <>
                <button
                  onClick={() => { setSuccess(null); setCopied(false); reset() }}
                  style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-surface)', color: 'var(--t-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  New Client
                </button>
                {onCreated ? (
                  <button
                    onClick={() => onCreated(success.companyId)}
                    style={{ flex: 2, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View Client Profile
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    style={{ flex: 2, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Done
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-surface)', color: 'var(--t-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="create-client-form"
                  disabled={isSubmitting}
                  style={{ flex: 2, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating…' : 'Create Client'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── DetailMode ───────────────────────────────────────────────────────────────

function DetailMode({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  return <ClientDetailModal clientId={clientId} role="admin" onClose={onClose} />
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ClientModal(props: ClientModalProps) {
  if (props.mode === 'create') return <CreateMode onClose={props.onClose} onCreated={props.onCreated} />
  return <DetailMode clientId={props.clientId} onClose={props.onClose} />
}
