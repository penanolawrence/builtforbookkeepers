'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAccountant, getAccountants, createAccountant,
  updateAccountant, resetAccountantPassword, deactivateAccountant,
} from '@/lib/api/admin/accountants'
import type { Accountant } from '@/types/admin'

export type AccountantModalProps =
  | { mode: 'detail'; accountantId: string; onClose: () => void }
  | { mode: 'invite'; onClose: () => void }

const STATUS_TIER: Record<string, string> = {
  ACTIVE: 'ready', INACTIVE: 'pending', PENDING_INVITE: 'check', SUSPENDED: 'review',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING_INVITE: 'Pending Invite', SUSPENDED: 'Suspended',
}
const CLIENT_STATUS_TIER: Record<string, string> = {
  ACTIVE: 'ready', OVERDUE: 'check', SUSPENDED: 'review', INACTIVE: 'pending',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Invite mode ────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  name:   z.string().min(1, 'Required'),
  email:  z.string().email('Invalid email'),
  mobile: z.string().optional(),
})
type InviteForm = z.infer<typeof inviteSchema>

function InviteMode({ onClose }: { onClose: () => void }) {
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const onSubmit = async (data: InviteForm) => {
    try {
      await createAccountant(data)
      setSuccessEmail(data.email)
    } catch {
      setSubmitError('Failed to send invite. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
          <span className="text-[15px] font-bold text-t-ink">Invite Accountant</span>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          {successEmail ? (
            <div className="space-y-4">
              <p className="text-sm text-t-muted">
                Invite sent to <span className="font-semibold text-t-ink">{successEmail}</span>.
              </p>
              <button
                onClick={onClose}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface w-full"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Full Name *</label>
                <input
                  {...register('name')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Email *</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Phone / Mobile</label>
                <input
                  {...register('mobile')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
              </div>
              {submitError && <p className="text-xs text-red-600">{submitError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-semibold px-3.5 py-2 rounded-md text-white disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
                    boxShadow: '0 8px 16px -8px var(--t-primary)',
                  }}
                >
                  {isSubmitting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail mode ─────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:   z.string().min(1, 'Required'),
  email:  z.string().email('Invalid email'),
  mobile: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

function DetailMode({ accountantId, onClose }: { accountantId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [replacementId, setReplacementId]   = useState('')
  const [toast, setToast]                   = useState<string | null>(null)
  const [saveError, setSaveError]           = useState<string | null>(null)

  const { data: accountant, isLoading } = useQuery({
    queryKey: ['admin-accountant', accountantId],
    queryFn:  () => getAccountant(accountantId),
  })

  const { data: allAccountants } = useQuery({
    queryKey: ['accountants'],
    queryFn:  getAccountants,
    enabled:  deactivateOpen,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', email: '', mobile: '' },
  })

  useEffect(() => {
    if (accountant) {
      reset({
        name:   accountant.name,
        email:  accountant.email,
        mobile: accountant.mobile ?? '',
      })
    }
  }, [accountant, reset])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const updateMut = useMutation({
    mutationFn: (data: EditForm) => updateAccountant(accountantId, {
      name:   data.name,
      email:  data.email,
      mobile: data.mobile || null,
    }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin-accountant', accountantId] })
      qc.invalidateQueries({ queryKey: ['accountants'] })
      reset({ name: updated.name, email: updated.email, mobile: updated.mobile ?? '' })
      setSaveError(null)
      showToast('Changes saved.')
    },
    onError: () => setSaveError('Failed to save changes. Please try again.'),
  })

  const resetMut = useMutation({
    mutationFn: () => resetAccountantPassword(accountantId),
    onSuccess:  () => showToast('Password reset email sent.'),
  })

  const deactivateMut = useMutation({
    mutationFn: () => deactivateAccountant(accountantId, replacementId || undefined),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['accountants'] })
      onClose()
    },
  })

  const otherActive = (allAccountants ?? []).filter((a: Accountant) => a.status === 'ACTIVE' && a.id !== accountantId)
  const clients     = accountant?.assignedClients ?? []
  const hasClients  = clients.length > 0
  const tier        = accountant ? (STATUS_TIER[accountant.status] ?? 'pending') : 'pending'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-t-line flex-shrink-0">
          {accountant && (
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
              background: 'var(--t-primary-soft)', color: 'var(--t-primary)',
              border: '1px solid var(--t-line)',
            }}>
              {getInitials(accountant.name)}
            </span>
          )}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[15px] font-bold text-t-ink truncate">{accountant?.name ?? '…'}</span>
            {accountant && (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: `var(--t-tier-${tier}-bg)`,
                color:      `var(--t-tier-${tier}-fg)`,
                border:     `1px solid var(--t-tier-${tier}-ring)`,
              }}>
                {STATUS_LABEL[accountant.status] ?? accountant.status}
              </span>
            )}
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="text-t-faint hover:text-t-muted text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Toast bar */}
        {toast && (
          <div className="px-6 py-2 bg-gray-900 text-white text-xs font-medium text-center flex-shrink-0">
            {toast}
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoading ? (
            <div className="text-sm text-t-faint text-center py-8">Loading…</div>
          ) : !accountant ? (
            <div className="text-sm text-red-600 text-center py-8">Accountant not found.</div>
          ) : (
            <>
              {/* Two-column: info + sidebar */}
              <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 260px' }}>

                {/* Info card — editable form */}
                <form
                  onSubmit={handleSubmit((data) => updateMut.mutate(data))}
                  className="bg-t-card border border-t-line rounded-lg p-5"
                >
                  <div className="text-xs font-bold text-t-muted uppercase tracking-wide pb-3 mb-4 border-b border-t-line">
                    Accountant Information
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Full Name *</label>
                      <input
                        {...register('name')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        {...register('email')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Phone / Mobile</label>
                      <input
                        {...register('mobile')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                    </div>
                  </div>
                  {saveError && <p className="text-xs text-red-600 mt-3">{saveError}</p>}
                  <div className="mt-4 pt-3 border-t border-t-line">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isDirty}
                      className="text-xs font-semibold px-4 py-2 rounded-md text-white disabled:opacity-50 transition-colors"
                      style={{
                        background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
                        boxShadow: '0 8px 16px -8px var(--t-primary)',
                      }}
                    >
                      {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>

                {/* Sidebar */}
                <div className="flex flex-col gap-3">
                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Account Status</div>
                    <div className="flex items-center justify-between">
                      <span style={{
                        display: 'inline-flex', padding: '4px 12px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 700,
                        background: `var(--t-tier-${tier}-bg)`,
                        color:      `var(--t-tier-${tier}-fg)`,
                        border:     `1px solid var(--t-tier-${tier}-ring)`,
                      }}>
                        {STATUS_LABEL[accountant.status] ?? accountant.status}
                      </span>
                      <span className="text-[11px] text-t-faint">Since {fmtDate(accountant.createdAt ?? null)}</span>
                    </div>
                  </div>

                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Workload</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-t-surface border border-t-line rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-t-ink leading-none">{accountant.clientCount ?? clients.length}</div>
                        <div className="text-[10px] text-t-faint mt-1">Clients</div>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-red-600 leading-none">{accountant.redCount ?? 0}</div>
                        <div className="text-[10px] text-t-faint mt-1">Open RED</div>
                      </div>
                      <div className="bg-t-primary-soft border border-t-line rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-t-primary leading-none">{accountant.pendingEntries ?? 0}</div>
                        <div className="text-[10px] text-t-faint mt-1">Pending</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Actions</div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => resetMut.mutate()}
                        disabled={resetMut.isPending}
                        className="w-full text-left text-xs font-semibold px-3 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface transition-colors disabled:opacity-50"
                      >
                        {resetMut.isPending ? 'Sending…' : '↺ Send Password Reset'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeactivateOpen(true); setReplacementId('') }}
                        className="w-full text-left text-xs font-semibold px-3 py-2 border border-red-200 rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        ✕ Deactivate Accountant
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned clients */}
              <div className="bg-t-card border border-t-line rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-t-line">
                  <span className="text-[13px] font-semibold text-t-ink">
                    Assigned Clients <span className="font-normal text-t-faint ml-1">{clients.length}</span>
                  </span>
                </div>
                {clients.length === 0 ? (
                  <div className="p-6 text-sm text-t-faint text-center">No clients assigned.</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['Business Name', 'Plan', 'Status', 'Open RED'].map((h) => (
                          <th key={h} className="bg-t-surface px-3 py-2 text-left text-[10px] font-bold text-t-muted uppercase tracking-wide border-b border-t-line whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c, i) => {
                        const statusTier = CLIENT_STATUS_TIER[c.clientStatus ?? ''] ?? 'pending'
                        return (
                          <tr key={c.id} className={i < clients.length - 1 ? 'border-b border-t-line' : ''}>
                            <td className="px-3 py-2">
                              <div className="text-xs font-medium text-t-ink">{c.name}</div>
                              {c.email && <div className="text-[11px] text-t-faint mt-0.5">{c.email}</div>}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-t-muted capitalize">
                              {c.plan} · {c.birType === 'vat' ? 'VAT' : 'Non-VAT'}
                            </td>
                            <td className="px-3 py-2">
                              <span style={{
                                display: 'inline-flex', padding: '3px 9px', borderRadius: 999,
                                fontSize: 11.5, fontWeight: 700,
                                background: `var(--t-tier-${statusTier}-bg)`,
                                color:      `var(--t-tier-${statusTier}-fg)`,
                                border:     `1px solid var(--t-tier-${statusTier}-ring)`,
                              }}>
                                {c.clientStatus ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {c.redCount > 0
                                ? <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">{c.redCount}</span>
                                : <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-t-muted">0</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deactivate overlay */}
      {deactivateOpen && accountant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35">
          <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
              <span className="text-[15px] font-bold text-t-ink">Deactivate {accountant.name}</span>
              <button type="button" onClick={() => setDeactivateOpen(false)} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-t-muted mb-4">
                {hasClients
                  ? <>This accountant has <strong>{clients.length} client{clients.length !== 1 ? 's' : ''}</strong>. Select a replacement accountant to transfer them before deactivating.</>
                  : <>Are you sure you want to deactivate <strong>{accountant.name}</strong>? This cannot be undone.</>}
              </p>
              {hasClients && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-t-muted mb-1.5">
                    Replacement Accountant <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={replacementId}
                    onChange={(e) => setReplacementId(e.target.value)}
                    className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="">Select replacement…</option>
                    {otherActive.map((a: Accountant) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {deactivateMut.isError && (
                <p className="text-xs text-red-600 mb-3">Failed to deactivate. Please try again.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-t-line">
              <button
                type="button"
                onClick={() => setDeactivateOpen(false)}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deactivateMut.mutate()}
                disabled={deactivateMut.isPending || (hasClients && !replacementId)}
                className="text-xs font-semibold px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                {deactivateMut.isPending ? 'Deactivating…' : hasClients ? 'Transfer & Deactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function AccountantModal(props: AccountantModalProps) {
  if (props.mode === 'invite') return <InviteMode onClose={props.onClose} />
  return <DetailMode accountantId={props.accountantId} onClose={props.onClose} />
}
