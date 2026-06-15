'use client'

import React, { useState, useEffect } from 'react'
import { X, Link, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import type { Account, ClientProfile } from '@/types/admin'
import type { AccountStatus } from '@/types/auth'
import {
  getClient, updateClient,
  suspendClient, reactivateClient, markClientOverdue, deactivateClient,
  resetClientAccess, reassignAccountant,
  getClientDocumentsAdmin, getChartOfAccounts, saveChartOfAccounts,
  getMerchants as getMerchantsAdmin,
  createMerchant as createMerchantAdmin,
  updateMerchant as updateMerchantAdmin,
  deleteMerchant as deleteMerchantAdmin,
} from '@/lib/api/admin/clients'
import {
  getAccountantClient, getAccountantClientDocuments, updateAccountantClient,
  getMerchants as getMerchantsAccountant,
  createMerchant as createMerchantAccountant,
  updateMerchant as updateMerchantAccountant,
  deleteMerchant as deleteMerchantAccountant,
} from '@/lib/api/accountant/clients'
import { AssignAccountantModal } from '@/components/admin/AssignAccountantModal'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { SubmitTab } from '@/components/upload/SubmitTab'
import type { PagedDocs } from '@/types/document'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'admin' | 'accountant'
type Tab  = 'overview' | 'submit' | 'documents' | 'merchants' | 'coa'

interface MerchantRow {
  id: string
  name: string
  tin: string | null
  address: string | null
  documentCount: number
}

export type ClientDetailModalProps = {
  clientId: string
  role: Role
  onClose: () => void
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:          z.string().min(1, 'Required'),
  mobile:        z.string().min(1, 'Required'),
  email:         z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  tin:           z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TIER: Record<AccountStatus, string> = {
  ACTIVE:    'ready',
  OVERDUE:   'check',
  SUSPENDED: 'review',
  INACTIVE:  'pending',
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE:    'Active',
  OVERDUE:   'Overdue',
  SUSPENDED: 'Suspended',
  INACTIVE:  'Inactive',
}

function fmtPeso(n?: number | null) {
  if (n == null) return '—'
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── CoaSection ──────────────────────────────────────────────────────────────

interface CoaSectionProps {
  title:     string
  accounts:  Account[]
  system?:   boolean
  hint?:     string
  onAdd?:    () => void
  onRemove?: (idx: number) => void
  onRename?: (idx: number, name: string) => void
  getIdx:    (a: Account) => number
}

function CoaSection({ title, accounts, system, hint, onAdd, onRemove, onRename, getIdx }: CoaSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', background: 'var(--t-card-alt)', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--t-line-soft)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown size={13} style={{ color: 'var(--t-faint)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .2s' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-ink)' }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '1px 7px' }}>{accounts.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hint && <span style={{ fontSize: 11, color: 'var(--t-faint)', fontStyle: 'italic' }}>{hint}</span>}
          {onAdd && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              style={{ border: '1.5px dashed var(--t-line)', background: 'transparent', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add Account
            </button>
          )}
        </div>
      </div>
      {open && accounts.map((a) => {
        const idx = getIdx(a)
        return (
          <div key={a.id || `draft-${idx}`} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 32px', gap: 10, alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid var(--t-line-soft)', background: idx % 2 === 0 ? 'transparent' : 'var(--t-card-alt)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-faint)', fontVariantNumeric: 'tabular-nums' }}>{a.code || '—'}</span>
            {system ? (
              <span style={{ fontSize: 13.5, color: 'var(--t-muted)' }}>{a.name}</span>
            ) : (
              <input
                value={a.name}
                onChange={(e) => onRename?.(idx, e.target.value)}
                style={{ border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '5px 10px', fontSize: 13.5, color: 'var(--t-ink)', background: 'var(--t-card)', fontFamily: 'inherit', fontWeight: 600, outline: 'none', width: '100%' }}
              />
            )}
            {system ? (
              <span style={{ fontSize: 13, color: 'var(--t-faint)', textAlign: 'center' }}>🔒</span>
            ) : (
              <button
                type="button"
                onClick={() => onRemove?.(idx)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--t-faint)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                aria-label={`Remove ${a.name}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── CoaTab ──────────────────────────────────────────────────────────────────

function CoaTab({ clientId, isVat }: { clientId: string; isVat: boolean }) {
  const queryClient = useQueryClient()
  const { toast }   = useToast()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['client-coa', clientId],
    queryFn:  () => getChartOfAccounts(clientId),
  })

  const [draft, setDraft] = useState<Account[]>(accounts)
  useEffect(() => { setDraft(accounts) }, [accounts])

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => saveChartOfAccounts(clientId, draft.map((a) => ({
      id:       a.id,
      name:     a.name,
      type:     a.type,
      isActive: a.isActive,
    }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-coa', clientId] })
      toast({ title: 'Chart of accounts saved.' })
    },
    onError: (err: Error) => {
      toast({ title: (err as any)?.response?.data?.message ?? 'Save failed.', variant: 'destructive' })
    },
  })

  function addAccount(type: 'income' | 'expense') {
    setDraft((d) => [...d, { id: '', code: '', name: 'New Account', type, isSystemManaged: false, isActive: true }])
  }
  function removeDraftAccount(idx: number) {
    setDraft((d) => d.filter((_, i) => i !== idx))
  }
  function renameDraftAccount(idx: number, name: string) {
    setDraft((d) => d.map((a, i) => i === idx ? { ...a, name } : a))
  }

  const income    = draft.filter((a) => a.type === 'income'  && !a.isSystemManaged)
  const expense   = draft.filter((a) => a.type === 'expense' && !a.isSystemManaged)
  const cash      = draft.filter((a) => a.type === 'cash')
  const vat       = draft.filter((a) => a.type === 'vat')
  const globalIdx = (a: Account) => draft.indexOf(a)

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>

  return (
    <div>
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden', margin: '20px 28px 0' }}>
        <CoaSection title="Income Accounts"  accounts={income}  onAdd={() => addAccount('income')}  onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Expense Accounts" accounts={expense} onAdd={() => addAccount('expense')} onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Cash / Payment Accounts" accounts={cash} system hint="System managed" getIdx={globalIdx} />
        {isVat && <CoaSection title="VAT Accounts" accounts={vat} system hint="System managed · VAT clients only" getIdx={globalIdx} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 24px' }}>
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          style={{ border: 0, borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '11px 22px', color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', boxShadow: '0 12px 22px -12px var(--t-primary)', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Chart of Accounts'}
        </button>
      </div>
    </div>
  )
}

// ─── DocumentsTab ────────────────────────────────────────────────────────────

type DocQueryFn = (
  clientId: string,
  params: { status?: string; type?: string; start?: string; end?: string; page?: number; per_page?: number }
) => Promise<PagedDocs>

function DocumentsTab({ clientId, queryFn, queryKey }: { clientId: string; queryFn: DocQueryFn; queryKey: string }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [start,        setStart]        = useState('')
  const [end,          setEnd]          = useState('')
  const [page,         setPage]         = useState(1)

  const { data: pagedDocs, isLoading } = useQuery({
    queryKey: [queryKey, clientId, statusFilter, typeFilter, start, end, page],
    queryFn:  () => queryFn(clientId, {
      status:   statusFilter || undefined,
      type:     typeFilter   || undefined,
      start:    start        || undefined,
      end:      end          || undefined,
      page,
      per_page: 10,
    }),
  })

  const selectStyle: React.CSSProperties = {
    width: '100%', height: 40, paddingLeft: 14, paddingRight: 36,
    borderRadius: 11, border: '1.5px solid var(--t-line)',
    background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600,
    color: 'var(--t-ink)', appearance: 'none', fontFamily: 'inherit', cursor: 'pointer',
  }

  const clearBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    border: 0, background: 'var(--t-card)', cursor: 'pointer', padding: 0,
    color: 'var(--t-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="PARKED">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="RETURNED">Returned</option>
            <option value="PROCESSING">Processing</option>
          </select>
          {statusFilter && (
            <button type="button" style={clearBtnStyle} onClick={() => { setStatusFilter(''); setPage(1) }} aria-label="Clear status filter">
              <X size={16} style={{ opacity: 0.5 }} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} style={selectStyle}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          {typeFilter && (
            <button type="button" style={clearBtnStyle} onClick={() => { setTypeFilter(''); setPage(1) }} aria-label="Clear type filter">
              <X size={16} style={{ opacity: 0.5 }} />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <input
          type="date" value={start} onChange={(e) => setStart(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)', fontFamily: 'inherit', width: '100%' }}
        />
        <input
          type="date" value={end} onChange={(e) => setEnd(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)', fontFamily: 'inherit', width: '100%' }}
        />
      </div>
      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
      ) : (
        <DocumentsTable
          docs={pagedDocs?.data ?? []}
          totalDocs={pagedDocs?.total ?? 0}
          lastPage={pagedDocs?.lastPage ?? 1}
          perPage={pagedDocs?.perPage ?? 10}
          page={page}
          onPageChange={setPage}
          inReview={pagedDocs?.inReview}
          onRowClick={() => {}}
        />
      )}
    </div>
  )
}

// ─── MerchantsTab ────────────────────────────────────────────────────────────

type MerchantEditState =
  | { type: 'none' }
  | { type: 'new' }
  | { type: 'edit'; id: string }

function MerchantsTab({ clientId, role }: { clientId: string; role: Role }) {
  const qc        = useQueryClient()
  const { toast } = useToast()

  const [editState, setEditState] = useState<MerchantEditState>({ type: 'none' })
  const [draft,     setDraft]     = useState({ name: '', tin: '', address: '' })
  const [saving,    setSaving]    = useState(false)

  const getFn    = role === 'admin' ? getMerchantsAdmin    : getMerchantsAccountant
  const createFn = role === 'admin' ? createMerchantAdmin  : createMerchantAccountant
  const updateFn = role === 'admin' ? updateMerchantAdmin  : updateMerchantAccountant
  const deleteFn = role === 'admin' ? deleteMerchantAdmin  : deleteMerchantAccountant

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['client-merchants', clientId],
    queryFn:  () => getFn(clientId),
  })

  function startNew() {
    setDraft({ name: '', tin: '', address: '' })
    setEditState({ type: 'new' })
  }

  function startEdit(m: MerchantRow) {
    setDraft({ name: m.name, tin: m.tin ?? '', address: m.address ?? '' })
    setEditState({ type: 'edit', id: m.id })
  }

  function cancelEdit() {
    setEditState({ type: 'none' })
    setDraft({ name: '', tin: '', address: '' })
  }

  async function handleSave() {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name:    draft.name.trim(),
        tin:     draft.tin.trim()     || undefined,
        address: draft.address.trim() || undefined,
      }
      if (editState.type === 'new') {
        await createFn(clientId, payload)
      } else if (editState.type === 'edit') {
        await updateFn(editState.id, payload)
      }
      qc.invalidateQueries({ queryKey: ['client-merchants', clientId] })
      toast({ title: 'Merchant saved.' })
      cancelEdit()
    } catch (err: unknown) {
      toast({ title: (err as any)?.response?.data?.message ?? 'Failed to save merchant.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFn(id)
      qc.invalidateQueries({ queryKey: ['client-merchants', clientId] })
      toast({ title: 'Merchant deleted.' })
    } catch (err: unknown) {
      toast({ title: (err as any)?.response?.data?.message ?? 'Failed to delete merchant.', variant: 'destructive' })
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '5px 10px',
    fontSize: 13, color: 'var(--t-ink)', background: 'var(--t-card)',
    fontFamily: 'inherit', fontWeight: 600, outline: 'none', width: '100%',
  }

  const rowGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 160px 1fr 80px',
    gap: 10,
    alignItems: 'center',
    padding: '9px 20px',
  }

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
  }

  const editRow = (
    <div style={{ ...rowGrid, background: 'var(--t-card-alt)', borderBottom: '1px solid var(--t-line-soft)' }}>
      <input
        autoFocus
        placeholder="Merchant name *"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        style={inputStyle}
      />
      <input
        placeholder="TIN"
        value={draft.tin}
        onChange={(e) => setDraft((d) => ({ ...d, tin: e.target.value }))}
        style={inputStyle}
      />
      <input
        placeholder="Address"
        value={draft.address}
        onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !draft.name.trim()}
          style={{ border: 0, borderRadius: 8, padding: '5px 12px', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', cursor: saving || !draft.name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !draft.name.trim() ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          style={{ border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '4px 8px', fontSize: 12.5, background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '20px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Merchants
        </span>
        {editState.type === 'none' && (
          <button
            type="button"
            onClick={startNew}
            style={{ border: '1.5px dashed var(--t-line)', background: 'transparent', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add Merchant
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{ ...rowGrid, background: 'var(--t-card-alt)', borderBottom: '1px solid var(--t-line-soft)' }}>
          {['Name', 'TIN', 'Address', ''].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>
          ))}
        </div>

        {/* New merchant row */}
        {editState.type === 'new' && editRow}

        {/* Existing merchants */}
        {merchants.length === 0 && editState.type !== 'new' ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, color: 'var(--t-faint)', marginBottom: 12 }}>No merchants yet.</div>
            <button
              type="button"
              onClick={startNew}
              style={{ border: '1.5px dashed var(--t-line)', background: 'transparent', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add Merchant
            </button>
          </div>
        ) : (
          merchants.map((m, idx) => {
            const isEditing = editState.type === 'edit' && editState.id === m.id
            if (isEditing) return <React.Fragment key={m.id}>{editRow}</React.Fragment>
            return (
              <div
                key={m.id}
                style={{ ...rowGrid, borderBottom: '1px solid var(--t-line-soft)', background: idx % 2 === 0 ? 'transparent' : 'var(--t-card-alt)' }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-ink)' }}>{m.name}</span>
                <span style={{ fontSize: 13, color: 'var(--t-muted)', fontVariantNumeric: 'tabular-nums' }}>{m.tin ?? '—'}</span>
                <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>{m.address ?? '—'}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    style={{ border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '4px 8px', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    aria-label={`Edit ${m.name}`}
                  >
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {m.documentCount === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      style={{ border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '4px 8px', background: 'var(--t-card)', color: 'var(--t-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      aria-label={`Delete ${m.name}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── OverviewTab ─────────────────────────────────────────────────────────────

function OverviewTab({
  clientId,
  role,
  client,
  queueCounts,
  onDeactivated,
}: {
  clientId:       string
  role:           Role
  client:         ClientProfile
  queueCounts?:   { red: number; yellow: number; green: number }
  onDeactivated:  () => void
}) {
  const qc        = useQueryClient()
  const { toast } = useToast()

  const [actionLoading, setActionLoading] = useState(false)
  const [reassignOpen,  setReassignOpen]  = useState(false)
  const [paymentOpen,   setPaymentOpen]   = useState(false)
  const [inviteLink,    setInviteLink]    = useState<string | null>(null)
  const [linkCopied,    setLinkCopied]    = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:          client.name,
      mobile:        client.mobile ?? '',
      email:         client.email ?? '',
      contactPerson: client.contactPerson ?? '',
      tin:           client.tin ?? '',
    },
  })

  useEffect(() => {
    reset({
      name:          client.name,
      mobile:        client.mobile ?? '',
      email:         client.email ?? '',
      contactPerson: client.contactPerson ?? '',
      tin:           client.tin ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, client.name, client.mobile, client.email, client.contactPerson, client.tin])

  const onSave = async (values: ProfileForm) => {
    const payload = {
      name:          values.name,
      mobile:        values.mobile,
      email:         values.email || undefined,
      contactPerson: values.contactPerson,
      tin:           values.tin,
    }
    try {
      if (role === 'admin') {
        await updateClient(clientId, payload)
      } else {
        await updateAccountantClient(clientId, payload)
      }
      qc.invalidateQueries({ queryKey: ['client-detail', clientId] })
      toast({ title: 'Changes saved.' })
    } catch (err: unknown) {
      toast({ title: (err as any)?.response?.data?.message ?? 'Failed to save changes.', variant: 'destructive' })
    }
  }

  const handleSuspend = async () => {
    setActionLoading(true)
    try {
      if (client.clientStatus === 'SUSPENDED') {
        await reactivateClient(clientId)
        toast({ title: 'Client reactivated.' })
      } else {
        await suspendClient(clientId)
        toast({ title: 'Client suspended.' })
      }
      qc.invalidateQueries({ queryKey: ['client-detail', clientId] })
    } catch {
      toast({ title: 'Action failed. Please try again.', variant: 'destructive' })
    } finally { setActionLoading(false) }
  }

  const handleMarkOverdue = async () => {
    setActionLoading(true)
    try {
      await markClientOverdue(clientId)
      toast({ title: 'Marked as overdue.' })
      qc.invalidateQueries({ queryKey: ['client-detail', clientId] })
    } catch {
      toast({ title: 'Action failed. Please try again.', variant: 'destructive' })
    } finally { setActionLoading(false) }
  }

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this client? This action cannot be undone.')) return
    setActionLoading(true)
    try {
      await deactivateClient(clientId)
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      onDeactivated()
    } finally { setActionLoading(false) }
  }

  const handleResetAccess = async () => {
    setActionLoading(true)
    try {
      const { inviteLink: link } = await resetClientAccess(clientId)
      setInviteLink(link)
      toast({ title: 'New invite link generated.' })
    } catch {
      toast({ title: 'Failed to reset access link.', variant: 'destructive' })
    } finally { setActionLoading(false) }
  }

  const handleReassignConfirm = async (accountantId: string) => {
    try {
      await reassignAccountant(clientId, accountantId)
      toast({ title: 'Accountant reassigned.' })
      qc.invalidateQueries({ queryKey: ['client-detail', clientId] })
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      setReassignOpen(false)
    } catch {
      toast({ title: 'Failed to reassign accountant.', variant: 'destructive' })
    }
  }

  const tier        = STATUS_TIER[client.clientStatus] ?? 'pending'
  const statusLabel = STATUS_LABEL[client.clientStatus] ?? client.clientStatus
  const isSuspended = client.clientStatus === 'SUSPENDED'
  const isInactive  = client.clientStatus === 'INACTIVE'
  const q           = queueCounts ?? { red: 0, yellow: 0, green: 0 }

  const inputCls    = 'w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-ink outline-none focus:border-t-primary transition-colors'
  const labelCls    = 'block text-xs font-semibold text-t-muted mb-1'
  const cardStyle   = { background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' } as const
  const cardTitle   = { fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 12 } as const

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, padding: '24px 28px' }}>

        {/* Left — editable form (shared) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
            Client Information
          </div>
          <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className={labelCls}>Business Name *</label>
              <input className={inputCls} {...register('name')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className={labelCls}>Mobile *</label>
                <input className={inputCls} {...register('mobile')} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" {...register('email')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input className={inputCls} {...register('contactPerson')} />
              </div>
              <div>
                <label className={labelCls}>TIN</label>
                <input className={inputCls} {...register('tin')} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input
                className="w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-faint bg-t-surface outline-none cursor-default"
                value={client.username ?? ''}
                readOnly
              />
              <div className="text-[11px] text-t-faint mt-1">System-generated — cannot be changed</div>
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right — role-specific sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Account Status — both roles */}
          <div style={cardStyle}>
            <div style={cardTitle}>Account Status</div>
            <span style={{ display: 'inline-flex', padding: '4px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: `var(--t-tier-${tier}-fg)`, background: `var(--t-tier-${tier}-bg)`, border: `1px solid var(--t-tier-${tier}-ring)` }}>
              {statusLabel}
            </span>
          </div>

          {/* Review Queue — accountant only */}
          {role === 'accountant' && (
            <div style={cardStyle}>
              <div style={cardTitle}>Review Queue</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {([['RED', q.red, 'review'], ['YEL', q.yellow, 'check'], ['GRN', q.green, 'ready']] as const).map(([lbl, n, t]) => (
                  <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ marginBottom: 4 }}>
                      {n === 0
                        ? <span style={{ color: 'var(--t-faint)', fontSize: 13 }}>—</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: `var(--t-tier-${t}-bg)`, color: `var(--t-tier-${t}-fg)`, border: `1px solid var(--t-tier-${t}-ring)`, minWidth: 28 }}>{n}</span>
                      }
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)' }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Accountant — both roles; Reassign button admin only */}
          <div style={cardStyle}>
            <div style={cardTitle}>Assigned Accountant</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-ink)' }}>{client.accountantName ?? '—'}</div>
              {role === 'admin' && !isInactive && (
                <button
                  onClick={() => setReassignOpen(true)}
                  className="border border-t-line rounded-md px-2.5 py-1 text-xs text-t-muted hover:bg-t-surface transition-colors"
                >
                  Reassign
                </button>
              )}
            </div>
          </div>

          {/* Billing — admin only */}
          {role === 'admin' && (
            <div style={cardStyle}>
              <div style={cardTitle}>Billing</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--t-faint)' }}>Last payment</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-ink)' }}>
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
          )}

          {/* Quick Actions — both roles; admin has additional actions */}
          <div style={cardStyle}>
            <div style={cardTitle}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {role === 'admin' && !isInactive && (
                <>
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
                </>
              )}
              <button
                type="button"
                onClick={handleResetAccess}
                disabled={actionLoading}
                style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 13, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, opacity: actionLoading ? 0.6 : 1 }}
              >
                <Link size={15} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
                Reset Access Link
              </button>
              {inviteLink && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11, color: 'var(--t-muted)' }}>{inviteLink}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                    style={{ fontSize: 11, color: 'var(--t-primary)', fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {linkCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
              {role === 'admin' && !isInactive && (
                <button
                  onClick={handleDeactivate}
                  disabled={actionLoading}
                  className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  ✕ Deactivate Client
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {role === 'admin' && (
        <>
          <AssignAccountantModal
            open={reassignOpen}
            clientId={clientId}
            currentAccountantId={client.accountantId ?? ''}
            onCancel={() => setReassignOpen(false)}
            onConfirm={handleReassignConfirm}
          />
          <ReceivePaymentModal
            open={paymentOpen}
            clientId={clientId}
            onCancel={() => setPaymentOpen(false)}
            onSuccess={() => {
              setPaymentOpen(false)
              toast({ title: 'Payment recorded.' })
              qc.invalidateQueries({ queryKey: ['client-detail', clientId] })
            }}
          />
        </>
      )}
    </>
  )
}

// ─── ClientDetailModal ───────────────────────────────────────────────────────

export function ClientDetailModal({ clientId, role, onClose }: ClientDetailModalProps) {
  const [tab, setTab] = useState<Tab>('overview')

  const { data: client, isLoading } = useQuery({
    queryKey: [role === 'admin' ? 'admin-client-detail' : 'accountant-client-detail', clientId],
    queryFn:  () => role === 'admin' ? getClient(clientId) : getAccountantClient(clientId),
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'submit',     label: 'Submit' },
    { id: 'documents',  label: 'Documents' },
    { id: 'merchants',  label: 'Merchants' },
    { id: 'coa',        label: 'Chart of Accounts' },
  ]

  const statusTier = client ? (STATUS_TIER[client.clientStatus] ?? 'pending') : 'pending'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 1280, maxHeight: '90vh', background: 'var(--t-card)', borderRadius: 24, boxShadow: 'var(--t-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--t-ink)' }}>
              {client?.name ?? '…'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                {client?.plan} Plan
              </span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--t-faint)', display: 'inline-block' }} />
              <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: `var(--t-tier-${statusTier}-fg)`, background: `var(--t-tier-${statusTier}-bg)`, border: `1px solid var(--t-tier-${statusTier}-ring)` }}>
                {client ? (STATUS_LABEL[client.clientStatus] ?? client.clientStatus) : '…'}
              </span>
              <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card-alt)', border: '1px solid var(--t-line)' }}>
                {client?.birType === 'vat' ? 'VAT' : 'Non-VAT'}
              </span>
            </div>
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--t-muted)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, padding: '0 28px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              style={{
                border: 0, background: 'transparent', padding: '13px 16px',
                fontSize: 13.5, fontWeight: tab === tb.id ? 700 : 600,
                color: tab === tb.id ? 'var(--t-primary)' : 'var(--t-muted)',
                cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: `2.5px solid ${tab === tb.id ? 'var(--t-primary)' : 'transparent'}`,
                marginBottom: -1, transition: 'color .15s, border-color .15s', whiteSpace: 'nowrap',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
          ) : !client ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'red' }}>Client not found.</div>
          ) : (
            <>
              {tab === 'overview' && (
                <OverviewTab
                  clientId={clientId}
                  role={role}
                  client={client}
                  queueCounts={client.queueCounts}
                  onDeactivated={onClose}
                />
              )}
              {tab === 'submit' && (
                <SubmitTab
                  clientId={clientId}
                  docsQueryKey={[role === 'admin' ? 'admin-client-docs' : 'client-modal-docs', clientId]}
                />
              )}
              {tab === 'documents' && (
                <DocumentsTab
                  clientId={clientId}
                  queryFn={role === 'admin' ? getClientDocumentsAdmin : getAccountantClientDocuments}
                  queryKey={role === 'admin' ? 'admin-client-docs' : 'client-modal-docs'}
                />
              )}
              {tab === 'merchants' && (
                <MerchantsTab clientId={clientId} role={role} />
              )}
              {tab === 'coa' && (
                <CoaTab clientId={clientId} isVat={client.birType === 'vat'} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
