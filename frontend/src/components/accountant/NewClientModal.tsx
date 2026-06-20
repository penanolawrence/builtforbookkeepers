'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAccountantClient } from '@/lib/api/accountant/clients'
import type { CreateClientPayload, CreateClientResult } from '@/lib/api/accountant/clients'
import { useToast } from '@/hooks/use-toast'
import { localCache } from '@/lib/localCache'

interface Props {
  onClose: () => void
}

type Field = keyof CreateClientPayload

const INDUSTRY_OPTIONS = [
  { value: 'retail',                label: 'Retail' },
  { value: 'services',              label: 'Services' },
  { value: 'restaurant',            label: 'Restaurant / F&B' },
  { value: 'construction',          label: 'Construction' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'manufacturing',         label: 'Manufacturing' },
]

const EMPTY: CreateClientPayload = {
  businessName:  '',
  mobile:        '',
  planType:      'starter',
  birType:       'non_vat',
  tin:           '',
  email:         '',
  contactPerson: '',
  industryType:  '',
}

export function NewClientModal({ onClose }: Props) {
  const { toast }   = useToast()
  const queryClient = useQueryClient()

  const [form, setForm]         = useState<CreateClientPayload>(EMPTY)
  const [errors, setErrors]     = useState<Partial<Record<Field, string>>>({})
  const [result, setResult]     = useState<CreateClientResult | null>(null)
  const [copied, setCopied]     = useState(false)

  const mutation = useMutation({
    mutationFn: () => createAccountantClient(form),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['accountant-clients'] })
      localCache.invalidatePrefix('clients_')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  function set(field: Field, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<Field, string>> = {}
    if (!form.businessName.trim()) e.businessName = 'Required'
    if (!form.mobile.trim())       e.mobile        = 'Required'
    if (!form.industryType)        e.industryType  = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (validate()) mutation.mutate()
  }

  function copyLink() {
    if (!result) return
    navigator.clipboard.writeText(result.inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = (field: Field) =>
    `w-full border rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card outline-none focus:ring-2 focus:ring-t-primary/30 ${
      errors[field] ? 'border-red-400' : 'border-t-line'
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
                Add New Client
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 3 }}>
                The client will be auto-assigned to you.
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
          <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result ? (
              /* ── Success screen ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--t-tier-ready-bg)', border: '2px solid var(--t-tier-ready-ring)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                  ✓
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t-ink)' }}>Client created!</div>
                  <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 4 }}>
                    Login username: <strong style={{ color: 'var(--t-ink)' }}>{result.username}</strong>
                  </div>
                </div>

                <div style={{ width: '100%', background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 8 }}>
                    Invite Link
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t-ink)', wordBreak: 'break-all', marginBottom: 10 }}>
                    {result.inviteLink}
                  </div>
                  <button
                    onClick={copyLink}
                    style={{ width: '100%', padding: '8px', borderRadius: 7, border: '1px solid var(--t-line)', background: copied ? 'var(--t-tier-ready-bg)' : 'var(--t-card)', color: copied ? 'var(--t-tier-ready-fg)' : 'var(--t-ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {copied ? '✓ Copied!' : 'Copy Invite Link'}
                  </button>
                </div>

                {form.email ? (
                  <div style={{ fontSize: 11.5, color: 'var(--t-muted)' }}>
                    Invite email sent to <strong>{form.email}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--t-muted)' }}>
                    No email provided — share the link manually.
                  </div>
                )}
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Business Name <span style={{ color: 'red' }}>*</span></label>
                    <input className={inputCls('businessName')} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="ABC Trading Corp." />
                    {errors.businessName && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.businessName}</div>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Mobile <span style={{ color: 'red' }}>*</span></label>
                    <input className={inputCls('mobile')} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="09XX XXX XXXX" />
                    {errors.mobile && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.mobile}</div>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>TIN</label>
                    <input className={inputCls('tin')} value={form.tin} onChange={(e) => set('tin', e.target.value)} placeholder="000-000-000" />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>VAT Type</label>
                    <select className={inputCls('birType')} value={form.birType} onChange={(e) => set('birType', e.target.value)}>
                      <option value="non_vat">Non-VAT</option>
                      <option value="vat">VAT</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Industry Type <span style={{ color: 'red' }}>*</span></label>
                    <select
                      className={inputCls('industryType')}
                      value={form.industryType ?? ''}
                      onChange={(e) => set('industryType', e.target.value)}
                    >
                      <option value="">Select industry…</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors.industryType && <div style={{ fontSize: 10.5, color: 'red', marginTop: 2 }}>{errors.industryType}</div>}
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Email</label>
                    <input className={inputCls('email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="client@email.com" />
                    <div style={{ fontSize: 10.5, color: 'var(--t-faint)', marginTop: 3 }}>Invite email will be sent automatically if provided.</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Contact Person</label>
                    <input className={inputCls('contactPerson')} value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Juan dela Cruz" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--t-line)', display: 'flex', gap: 10, flexShrink: 0 }}>
            {result ? (
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-surface)', color: 'var(--t-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  style={{ flex: 2, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}
                >
                  {mutation.isPending ? 'Creating…' : 'Create Client'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
