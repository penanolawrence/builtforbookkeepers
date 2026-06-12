'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  createClient, getClient, updateClient, updatePlan,
  suspendClient, reactivateClient, markClientOverdue, deactivateClient,
  resetClientAccess, reassignAccountant,
  getClientDocumentsAdmin, getChartOfAccounts, saveChartOfAccounts,
} from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { AssignAccountantModal } from '@/components/admin/AssignAccountantModal'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import type { Account } from '@/types/admin'
import type { Document, DocumentStatus } from '@/types/document'
import type { AccountStatus } from '@/types/auth'
import { SubmitTab } from '@/components/upload/SubmitTab'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents' | 'coa' | 'submit'
type EditableAccount = Account & { _new?: boolean }

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
})
type CreateForm = z.infer<typeof createSchema>

const detailSchema = z.object({
  name:          z.string().min(1, 'Required'),
  mobile:        z.string().min(1, 'Required'),
  email:         z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  tin:           z.string().optional(),
  planType:      z.enum(['starter', 'growth', 'premium']),
  birType:       z.enum(['vat', 'non_vat']),
})
type DetailForm = z.infer<typeof detailSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<AccountStatus, { label: string; tier: string }> = {
  ACTIVE:    { label: 'Active',    tier: 'ready' },
  OVERDUE:   { label: 'Overdue',   tier: 'check' },
  SUSPENDED: { label: 'Suspended', tier: 'review' },
  INACTIVE:  { label: 'Inactive',  tier: 'pending' },
}

const DOC_STATUS: Record<DocumentStatus, { label: string; cls: string }> = {
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-800' },
  PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED:   { label: 'Posted',     cls: 'bg-green-100 text-green-800' },
  RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-800' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'Withdrawn',  cls: 'bg-gray-100 text-gray-400' },
}

const COA_LABELS: Record<string, string> = {
  income:  'Income Accounts',
  expense: 'Expense Accounts',
  cash:    'Cash / Payment Accounts',
  vat:     'VAT Accounts',
  equity:  "Owner's Equity",
}

function fmtShort(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtPeso(n?: number | null) {
  if (n == null) return '—'
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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
  const qc     = useQueryClient()
  const router = useRouter()

  const [tab,           setTab]           = useState<Tab>('overview')
  const [reassignOpen,  setReassignOpen]  = useState(false)
  const [paymentOpen,   setPaymentOpen]   = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [inviteLink,    setInviteLink]    = useState<string | null>(null)
  const [linkCopied,    setLinkCopied]    = useState(false)
  const [toast,         setToast]         = useState<string | null>(null)
  const [warning,       setWarning]       = useState<string | null>(null)
  const [saveError,     setSaveError]     = useState<string | null>(null)

  const [docStatus, setDocStatus] = useState('')
  const [docType,   setDocType]   = useState('')
  const [docStart,  setDocStart]  = useState('')
  const [docEnd,    setDocEnd]    = useState('')
  const [docPage,   setDocPage]   = useState(1)

  const [coaAccounts, setCoaAccounts] = useState<EditableAccount[]>([])
  const [coaSaving,   setCoaSaving]   = useState(false)
  const [collapsed,   setCollapsed]   = useState<Record<string, boolean>>({})

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', clientId],
    queryFn:  () => getClient(clientId),
  })

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { isSubmitting },
  } = useForm<DetailForm>({
    resolver: zodResolver(detailSchema),
    defaultValues: { name: '', mobile: '', email: '', contactPerson: '', tin: '', planType: 'starter', birType: 'non_vat' },
  })

  useEffect(() => {
    if (!client) return
    reset({
      name:          client.name,
      mobile:        client.mobile ?? '',
      email:         client.email ?? '',
      contactPerson: client.contactPerson ?? '',
      tin:           client.tin ?? '',
      planType:      (client.plan ?? 'starter') as 'starter' | 'growth' | 'premium',
      birType:       (client.birType ?? 'non_vat') as 'vat' | 'non_vat',
    })
    // depend on clientId (stable primitive) so that the effect runs once per
    // loaded client rather than on every render where data reference may differ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, client?.name, client?.mobile, client?.email, client?.contactPerson, client?.tin, client?.plan, client?.birType])

  const { data: pagedDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-client-docs', clientId, docStatus, docType, docStart, docEnd, docPage],
    queryFn:  () => getClientDocumentsAdmin(clientId, {
      status:   docStatus || undefined,
      type:     docType   || undefined,
      start:    docStart  || undefined,
      end:      docEnd    || undefined,
      page:     docPage,
      per_page: 10,
    }),
    enabled: tab === 'documents',
  })
  const documents     = pagedDocuments?.data ?? []
  const docsTotal     = pagedDocuments?.total ?? 0
  const docsLastPage  = pagedDocuments?.lastPage ?? 1

  const { data: coaData } = useQuery({
    queryKey: ['admin-coa', clientId],
    queryFn:  () => getChartOfAccounts(clientId),
    enabled:  tab === 'coa',
  })

  useEffect(() => { if (coaData) setCoaAccounts(coaData) }, [coaData])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-client', clientId] })
  }

  const onSave = async (values: DetailForm) => {
    setSaveError(null)
    try {
      await updateClient(clientId, {
        name:          values.name,
        mobile:        values.mobile,
        email:         values.email || undefined,
        contactPerson: values.contactPerson,
        tin:           values.tin,
      })
      const result = await updatePlan(clientId, { planType: values.planType, birType: values.birType })
      setWarning(result.warning ?? null)
      setToast('Changes saved.')
      invalidate()
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    } catch {
      setSaveError('Failed to save changes. Please try again.')
    }
  }

  const handleSuspend = async () => {
    setActionLoading(true)
    try {
      if (client?.clientStatus === 'SUSPENDED') {
        await reactivateClient(clientId)
        setToast('Client reactivated.')
      } else {
        await suspendClient(clientId)
        setToast('Client suspended.')
      }
      invalidate()
    } finally { setActionLoading(false) }
  }

  const handleMarkOverdue = async () => {
    setActionLoading(true)
    try { await markClientOverdue(clientId); setToast('Marked as overdue.'); invalidate() }
    finally { setActionLoading(false) }
  }

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this client? This action cannot be undone.')) return
    setActionLoading(true)
    try {
      await deactivateClient(clientId)
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      onClose()
    } finally { setActionLoading(false) }
  }

  const handleResetAccess = async () => {
    setActionLoading(true)
    try {
      const { inviteLink: link } = await resetClientAccess(clientId)
      setInviteLink(link)
      setToast('New invite link generated.')
    } catch {
      setToast('Failed to reset access link.')
    } finally { setActionLoading(false) }
  }

  const handleReassign = async (accountantId: string) => {
    try {
      await reassignAccountant(clientId, accountantId)
      setToast('Accountant reassigned.')
      invalidate()
      setReassignOpen(false)
    } catch {
      setToast('Failed to reassign accountant.')
    }
  }

  const updateCoaField = (idx: number, field: 'code' | 'name', value: string) =>
    setCoaAccounts((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a))

  const addAccount = (type: 'income' | 'expense') =>
    setCoaAccounts((prev) => [
      ...prev,
      { id: `_new_${Date.now()}`, code: '', name: '', type, isSystemManaged: false, isActive: true, _new: true },
    ])

  const removeAccount = (idx: number) =>
    setCoaAccounts((prev) => prev.filter((_, i) => i !== idx))

  const handleSaveCoa = async () => {
    setCoaSaving(true)
    try {
      await saveChartOfAccounts(clientId, coaAccounts.map((a) => ({
        id:       a._new ? undefined : a.id,
        code:     a.code,
        name:     a.name,
        type:     a.type,
        isActive: a.isActive,
      })))
      setToast('Chart of accounts saved.')
      qc.invalidateQueries({ queryKey: ['admin-coa', clientId] })
    } finally { setCoaSaving(false) }
  }

  const coaByType = coaAccounts.reduce<Record<string, EditableAccount[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const isSuspended = client?.clientStatus === 'SUSPENDED'
  const isInactive  = client?.clientStatus === 'INACTIVE'
  const badge       = client ? (STATUS_BADGE[client.clientStatus] ?? STATUS_BADGE.ACTIVE) : null

  const inputCls    = 'w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-ink outline-none focus:border-t-primary transition-colors'
  const readonlyCls = 'w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-faint bg-t-surface outline-none cursor-default'
  const labelCls    = 'block text-xs font-semibold text-t-muted mb-1'
  const sideCardCls = 'bg-t-card border border-t-line rounded-lg p-4 mb-3'
  const sideTitleCls = 'text-[11px] font-bold uppercase tracking-wide text-t-faint mb-2.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-t-line flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[15px] font-bold text-t-ink truncate">{client?.name ?? '…'}</span>
            {badge && (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: `var(--t-tier-${badge.tier}-bg)`,
                color:      `var(--t-tier-${badge.tier}-fg)`,
                border:     `1px solid var(--t-tier-${badge.tier}-ring)`,
              }}>
                {badge.label}
              </span>
            )}
          </div>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Toast bar */}
        {toast && (
          <div className="px-6 py-2 bg-gray-900 text-white text-xs font-medium text-center flex-shrink-0">
            {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-t-line flex-shrink-0">
          {(['overview', 'documents', 'coa', 'submit'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'text-t-primary font-semibold border-t-primary'
                  : 'text-t-faint border-transparent hover:text-t-ink'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'documents' ? 'Documents' : t === 'coa' ? 'Chart of Accounts' : 'Submit'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-8 text-sm text-t-faint text-center">Loading…</div>
          ) : !client ? (
            <div className="p-8 text-sm text-red-600 text-center">Client not found.</div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div className="p-5 grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
                  {/* Left: profile + plan form */}
                  <div>
                    <div className="text-xs font-bold text-t-ink mb-3.5 pb-2 border-b border-t-line">
                      Client Information
                    </div>
                    <form onSubmit={handleSubmit(onSave)}>
                      <div className="mb-3.5">
                        <label className={labelCls}>Business Name *</label>
                        <input className={inputCls} {...register('name')} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3.5">
                        <div>
                          <label className={labelCls}>Mobile *</label>
                          <input className={inputCls} {...register('mobile')} />
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          <input className={inputCls} type="email" {...register('email')} />
                          <div className="text-[11px] text-t-faint mt-1">Optional — leave blank if client has no email</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3.5">
                        <div>
                          <label className={labelCls}>Contact Person</label>
                          <input className={inputCls} {...register('contactPerson')} />
                        </div>
                        <div>
                          <label className={labelCls}>TIN</label>
                          <input className={inputCls} {...register('tin')} />
                        </div>
                      </div>
                      <div className="mb-3.5">
                        <label className={labelCls}>Username</label>
                        <input className={readonlyCls} value={client.username ?? ''} readOnly />
                        <div className="text-[11px] text-t-faint mt-1">System-generated — cannot be changed</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className={labelCls}>Plan</label>
                          <select
                            value={watch('planType')}
                            onChange={(e) => setValue('planType', e.target.value as 'starter' | 'growth' | 'premium')}
                            className={inputCls}
                          >
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>VAT Type</label>
                          <select
                            value={watch('birType')}
                            onChange={(e) => setValue('birType', e.target.value as 'vat' | 'non_vat')}
                            className={inputCls}
                          >
                            <option value="non_vat">Non-VAT</option>
                            <option value="vat">VAT Registered</option>
                          </select>
                        </div>
                      </div>
                      {warning && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 mb-3">
                          <p>{warning}</p>
                        </div>
                      )}
                      {saveError && <p className="text-xs text-red-600 mb-3">{saveError}</p>}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                      >
                        {isSubmitting ? 'Saving…' : 'Save Changes'}
                      </button>
                    </form>
                  </div>

                  {/* Right: sidebar */}
                  <div>
                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Account Status</div>
                      {badge && (
                        <span style={{
                          display: 'inline-flex', padding: '4px 12px', borderRadius: 999,
                          fontSize: 12.5, fontWeight: 700,
                          background: `var(--t-tier-${badge.tier}-bg)`,
                          color:      `var(--t-tier-${badge.tier}-fg)`,
                          border:     `1px solid var(--t-tier-${badge.tier}-ring)`,
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Assigned Accountant</div>
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-t-ink">{client.accountantName ?? '—'}</div>
                        {!isInactive && (
                          <button
                            onClick={() => setReassignOpen(true)}
                            className="border border-t-line rounded-md px-2.5 py-1 text-xs text-t-muted hover:bg-t-surface transition-colors"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Billing</div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="text-[11px] text-t-faint">Last payment</div>
                          <div className="text-[13px] font-semibold text-t-ink">
                            {client.lastPayment
                              ? `${fmtPeso(client.lastPayment.amount)} · ${fmtShort(client.lastPayment.dateReceived)}`
                              : 'No payments yet'}
                          </div>
                        </div>
                        <button
                          onClick={() => setPaymentOpen(true)}
                          className="border border-t-line rounded-md px-2.5 py-1 text-xs text-t-muted hover:bg-t-surface transition-colors"
                        >
                          Receive Payment
                        </button>
                      </div>
                    </div>

                    {!isInactive && (
                      <div className={sideCardCls}>
                        <div className={sideTitleCls}>Quick Actions</div>
                        <div className="flex flex-col gap-1.5">
                          {client.clientStatus === 'ACTIVE' && (
                            <button
                              onClick={handleMarkOverdue}
                              disabled={actionLoading}
                              className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                            >
                              ⏸ Mark as Overdue
                            </button>
                          )}
                          <button
                            onClick={handleSuspend}
                            disabled={actionLoading}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                          >
                            {isSuspended ? '🔓 Reactivate Client' : '🔒 Suspend Client'}
                          </button>
                          <button
                            onClick={handleResetAccess}
                            disabled={actionLoading}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-t-line bg-t-card text-t-ink hover:bg-t-surface disabled:opacity-60 transition-colors"
                          >
                            🔗 Reset Access Link
                          </button>
                          <button
                            onClick={handleDeactivate}
                            disabled={actionLoading}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                          >
                            ✕ Deactivate Client
                          </button>
                        </div>
                        {inviteLink && (
                          <div className="mt-3 flex items-center gap-2 bg-t-surface border border-t-line rounded-lg px-2.5 py-2">
                            <span className="flex-1 truncate font-mono text-[11px] text-t-muted">{inviteLink}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink)
                                setLinkCopied(true)
                                setTimeout(() => setLinkCopied(false), 2000)
                              }}
                              className="text-[11px] text-t-primary font-semibold flex-shrink-0"
                            >
                              {linkCopied ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {tab === 'documents' && (
                <div>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-t-line bg-t-surface">
                    <select
                      value={docStatus}
                      onChange={(e) => { setDocStatus(e.target.value); setDocPage(1) }}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card cursor-pointer"
                    >
                      <option value="">All statuses</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PARKED">In Review</option>
                      <option value="APPROVED">Posted</option>
                      <option value="RETURNED">Returned</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <select
                      value={docType}
                      onChange={(e) => { setDocType(e.target.value); setDocPage(1) }}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card cursor-pointer"
                    >
                      <option value="">All types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <input
                      type="date"
                      value={docStart}
                      onChange={(e) => { setDocStart(e.target.value); setDocPage(1) }}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card w-32"
                    />
                    <span className="text-xs text-t-faint">–</span>
                    <input
                      type="date"
                      value={docEnd}
                      onChange={(e) => { setDocEnd(e.target.value); setDocPage(1) }}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card w-32"
                    />
                  </div>
                  {docsLoading ? (
                    <div className="p-8 text-sm text-t-faint text-center">Loading…</div>
                  ) : !documents || documents.length === 0 ? (
                    <div className="p-8 text-sm text-t-faint text-center">No documents found.</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['Filename', 'Type', 'Amount', 'Merchant', 'Uploaded', 'Status'].map((h) => (
                            <th key={h} className="bg-t-surface px-3 py-2 text-left text-[10px] font-bold text-t-muted uppercase tracking-wide border-b border-t-line">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(documents as Document[]).map((doc, i) => {
                          const ds = DOC_STATUS[doc.status] ?? { label: doc.status, cls: 'bg-gray-100 text-gray-600' }
                          return (
                            <tr
                              key={doc.id}
                              onClick={() => router.push(`/admin/queue/${doc.id}`)}
                              className={`cursor-pointer hover:bg-t-surface ${i < documents.length - 1 ? 'border-b border-t-line' : ''}`}
                            >
                              <td className="px-3 py-2 text-xs font-medium text-t-ink max-w-[180px] truncate">
                                {doc.refNumber ?? `Doc #${doc.id.slice(0, 8)}`}
                              </td>
                              <td className="px-3 py-2 text-xs text-t-faint capitalize">{doc.declaredType ?? '—'}</td>
                              <td className="px-3 py-2 text-xs font-medium text-t-ink">{fmtPeso(doc.amount)}</td>
                              <td className="px-3 py-2 text-xs text-t-faint">{doc.merchantName ?? 'Not detected'}</td>
                              <td className="px-3 py-2 text-xs text-t-faint whitespace-nowrap">{fmtShort(doc.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${ds.cls}`}>
                                  {ds.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                  {docsLastPage > 1 && (
                    <div className="flex items-center justify-between px-3.5 py-2 border-t border-t-line bg-t-card">
                      <span className="text-[11px] text-t-faint">
                        Page {docPage} of {docsLastPage} · {docsTotal} total
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                          disabled={docPage === 1}
                          className="w-7 h-7 flex items-center justify-center rounded border border-t-line bg-t-card text-xs text-t-ink"
                          style={{ opacity: docPage === 1 ? 0.35 : 1, cursor: docPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setDocPage((p) => Math.min(docsLastPage, p + 1))}
                          disabled={docPage === docsLastPage}
                          className="w-7 h-7 flex items-center justify-center rounded border border-t-line bg-t-card text-xs text-t-ink"
                          style={{ opacity: docPage === docsLastPage ? 0.35 : 1, cursor: docPage === docsLastPage ? 'not-allowed' : 'pointer' }}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SUBMIT TAB ── */}
              {tab === 'submit' && (
                <SubmitTab
                  clientId={clientId}
                  docsQueryKey={['admin-client-docs', clientId]}
                />
              )}

              {/* ── COA TAB ── */}
              {tab === 'coa' && (
                <div>
                  {(['income', 'expense', 'cash', 'vat', 'equity'] as const).map((type) => {
                    const accounts   = coaByType[type] ?? []
                    const isEditable  = type === 'income' || type === 'expense'
                    const isCollapsed = collapsed[type]
                    return (
                      <div key={type}>
                        <div
                          className="flex items-center justify-between px-3 py-2 bg-t-surface border-b border-t-line cursor-pointer select-none"
                          onClick={() => setCollapsed((p) => ({ ...p, [type]: !p[type] }))}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wide text-t-muted">
                            <span className="mr-1.5 text-t-faint">{isCollapsed ? '▶' : '▼'}</span>
                            {COA_LABELS[type]}
                          </span>
                          {isEditable ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); addAccount(type) }}
                              className="text-[11px] font-semibold text-t-muted border border-dashed border-t-line rounded px-2 py-0.5 bg-t-card hover:border-t-primary hover:text-t-primary transition-colors"
                            >
                              + Add Account
                            </button>
                          ) : (
                            <span className="text-[10px] text-t-faint">System managed</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <div>
                            {accounts.map((a) => {
                              const globalIdx = coaAccounts.findIndex((x) => x.id === a.id)
                              return (
                                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-t-line last:border-0">
                                  <span className="text-[11px] text-t-faint w-10 flex-shrink-0">{a.code}</span>
                                  <input
                                    value={a.name}
                                    onChange={(e) => isEditable && !a.isSystemManaged ? updateCoaField(globalIdx, 'name', e.target.value) : undefined}
                                    readOnly={!isEditable || a.isSystemManaged}
                                    className={`flex-1 border text-[12px] rounded px-1.5 py-1 outline-none transition-colors ${
                                      !isEditable || a.isSystemManaged
                                        ? 'border-transparent bg-transparent text-t-faint cursor-default'
                                        : 'border-transparent bg-transparent text-t-ink hover:border-t-line focus:border-t-primary focus:bg-t-card'
                                    }`}
                                  />
                                  {isEditable && !a.isSystemManaged ? (
                                    <button
                                      onClick={() => removeAccount(globalIdx)}
                                      className="text-t-faint hover:text-red-500 text-sm px-1 transition-colors flex-shrink-0"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-t-faint flex-shrink-0">🔒</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex justify-end px-4 py-3 border-t border-t-line bg-t-surface">
                    <button
                      onClick={handleSaveCoa}
                      disabled={coaSaving}
                      className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      {coaSaving ? 'Saving…' : 'Save Chart of Accounts'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Layered modals (z-[60] to sit above z-50 detail modal) */}
      <AssignAccountantModal
        open={reassignOpen}
        clientId={clientId}
        currentAccountantId={client?.accountantId ?? ''}
        onCancel={() => setReassignOpen(false)}
        onConfirm={handleReassign}
      />
      <ReceivePaymentModal
        open={paymentOpen}
        clientId={clientId}
        onCancel={() => setPaymentOpen(false)}
        onSuccess={() => { setPaymentOpen(false); setToast('Payment recorded.'); invalidate() }}
      />
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ClientModal(props: ClientModalProps) {
  if (props.mode === 'create') return <CreateMode onClose={props.onClose} onCreated={props.onCreated} />
  return <DetailMode clientId={props.clientId} onClose={props.onClose} />
}
