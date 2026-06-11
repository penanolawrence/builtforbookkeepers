'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Link, ChevronDown } from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { ClientProfile, Account } from '@/types/admin'
import { useToast } from '@/hooks/use-toast'
import { getAccountantClient, getAccountantClientDocuments } from '@/lib/api/accountant/clients'
import { resetClientAccess, getChartOfAccounts, saveChartOfAccounts } from '@/lib/api/admin/clients'
import { lastSevenDayRange } from '@/app/client/documents/utils'
import { DocumentsTable } from '@/components/documents/DocumentsTable'

type Tab = 'overview' | 'documents' | 'coa'

interface Props {
  client: ClientProfile
  onClose: () => void
}

function OverviewTab({ client }: { client: ClientProfile }) {
  const { toast } = useToast()
  const { data: detail } = useQuery({
    queryKey: ['accountant-client-detail', client.id],
    queryFn: () => getAccountantClient(client.id),
  })
  const queryClient = useQueryClient()

  async function handleResetAccess() {
    try {
      await resetClientAccess(client.id)
      queryClient.invalidateQueries({ queryKey: ['accountant-client-detail', client.id] })
      toast({ title: 'Access link reset — new link sent to client.' })
    } catch {
      toast({ title: 'Failed to reset access link.', variant: 'destructive' })
    }
  }

  const infoRows: { label: string; value: string }[] = [
    { label: 'Business Name',  value: client.name },
    { label: 'Mobile',         value: client.mobile ?? '—' },
    { label: 'Email',          value: client.email ?? '—' },
    { label: 'Contact Person', value: client.contactPerson ?? '—' },
    { label: 'TIN',            value: client.tin ?? '—' },
    { label: 'Username',       value: client.username ?? '—' },
    { label: 'Plan',           value: `${client.plan} · ${client.birType === 'vat' ? 'VAT' : 'Non-VAT'}` },
  ]

  const q = detail?.queueCounts ?? { red: 0, yellow: 0, green: 0 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, padding: '24px 28px' }}>

      {/* Left — client info */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
          Client Information
        </div>
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden' }}>
          {infoRows.map((row, i) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '12px 16px', borderBottom: i < infoRows.length - 1 ? '1px solid var(--t-line-soft)' : 'none', background: i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Account status */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Account Status</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {(() => {
              const statusTier: Record<string, string> = {
                ACTIVE: 'ready', SUSPENDED: 'review', OVERDUE: 'check', INACTIVE: 'pending',
              }
              const tier = statusTier[client.clientStatus ?? ''] ?? 'pending'
              return (
                <span style={{ display: 'inline-flex', padding: '4px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: `var(--t-tier-${tier}-fg)`, background: `var(--t-tier-${tier}-bg)`, border: `1px solid var(--t-tier-${tier}-ring)` }}>
                  {client.clientStatus ?? 'Active'}
                </span>
              )
            })()}
            <span style={{ fontSize: 12, color: 'var(--t-faint)', textTransform: 'capitalize' }}>{client.plan} · {client.birType === 'vat' ? 'VAT' : 'Non-VAT'}</span>
          </div>
        </div>

        {/* Queue flags */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Review Queue</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([['RED', q.red, 'review'], ['YEL', q.yellow, 'check'], ['GRN', q.green, 'ready']] as const).map(([lbl, n, tier]) => (
              <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ marginBottom: 4 }}>
                  {n === 0
                    ? <span style={{ color: 'var(--t-faint)', fontSize: 13 }}>—</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: `var(--t-tier-${tier}-bg)`, color: `var(--t-tier-${tier}-fg)`, border: `1px solid var(--t-tier-${tier}-ring)`, minWidth: 28 }}>{n}</span>
                  }
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned accountant */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Assigned Accountant</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-ink)' }}>{client.accountantName}</div>
        </div>

        {/* Quick actions */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Quick Actions</div>
          <button
            type="button"
            onClick={handleResetAccess}
            style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Link size={15} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
            Reset Access Link
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentsTab({ clientId }: { clientId: string }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [start,        setStart]        = useState('')
  const [end,          setEnd]          = useState('')
  const [page,         setPage]         = useState(1)
  const defaultsApplied = useRef(false)

  useEffect(() => {
    if (defaultsApplied.current) return
    defaultsApplied.current = true
    if (start || end) return
    const range = lastSevenDayRange()
    setStart(range.start)
    setEnd(range.end)
  }, [start, end])

  const { data: pagedDocs, isLoading } = useQuery({
    queryKey: ['client-modal-docs', clientId, statusFilter, typeFilter, start, end, page],
    queryFn: () => getAccountantClientDocuments(clientId, {
      status:   statusFilter || undefined,
      type:     typeFilter   || undefined,
      start:    start        || undefined,
      end:      end          || undefined,
      page,
      per_page: 10,
    }),
    enabled: !!(start && end),
  })

  const selectStyle: React.CSSProperties = {
    width: '100%', height: 40, paddingLeft: 14, paddingRight: 36,
    borderRadius: 11, border: '1.5px solid var(--t-line)',
    background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600,
    color: 'var(--t-ink)', appearance: 'none' as const, fontFamily: 'inherit', cursor: 'pointer',
  }

  const clearBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    border: 0, background: 'var(--t-card)', cursor: 'pointer', padding: 0,
    color: 'var(--t-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      {/* Row 1 — Status + Type */}
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

      {/* Row 2 — Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)', fontFamily: 'inherit', width: '100%' }}
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
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

interface CoaSectionProps {
  title: string
  accounts: Account[]
  system?: boolean
  hint?: string
  onAdd?: () => void
  onRemove?: (idx: number) => void
  onRename?: (idx: number, name: string) => void
  getIdx: (a: Account) => number
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

  const income  = draft.filter((a) => a.type === 'income'  && !a.isSystemManaged)
  const expense = draft.filter((a) => a.type === 'expense' && !a.isSystemManaged)
  const cash    = draft.filter((a) => a.type === 'cash')
  const vat     = draft.filter((a) => a.type === 'vat')

  function globalIdx(account: Account) { return draft.indexOf(account) }

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>

  return (
    <div>
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden', margin: '20px 28px 0' }}>
        <CoaSection title="Income Accounts"  accounts={income}  onAdd={() => addAccount('income')}  onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Expense Accounts" accounts={expense} onAdd={() => addAccount('expense')} onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Cash / Payment Accounts"            accounts={cash} system hint="System managed" getIdx={globalIdx} />
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

export function ClientDetailModal({ client, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'coa',       label: 'Chart of Accounts' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', background: 'var(--t-card)', borderRadius: 24, boxShadow: 'var(--t-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--t-ink)' }}>
              {client.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{client.plan} Plan</span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--t-faint)', display: 'inline-block' }} />
              {(() => {
                const statusTier: Record<string, string> = {
                  ACTIVE: 'ready', SUSPENDED: 'review', OVERDUE: 'check', INACTIVE: 'pending',
                }
                const tier = statusTier[client.clientStatus ?? ''] ?? 'pending'
                return (
                  <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: `var(--t-tier-${tier}-fg)`, background: `var(--t-tier-${tier}-bg)`, border: `1px solid var(--t-tier-${tier}-ring)` }}>
                    {client.clientStatus ?? 'Active'}
                  </span>
                )
              })()}
              <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card-alt)', border: '1px solid var(--t-line)' }}>
                {client.birType === 'vat' ? 'VAT' : 'Non-VAT'}
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
              style={{ border: 0, background: 'transparent', padding: '13px 16px', fontSize: 13.5, fontWeight: tab === tb.id ? 700 : 600, color: tab === tb.id ? 'var(--t-primary)' : 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit', borderBottom: `2.5px solid ${tab === tb.id ? 'var(--t-primary)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s, border-color .15s', whiteSpace: 'nowrap' }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'overview' && <OverviewTab client={client} />}
          {tab === 'documents' && <DocumentsTab clientId={client.id} />}
          {tab === 'coa'       && <CoaTab clientId={client.id} isVat={client.birType === 'vat'} />}
        </div>
      </div>
    </div>
  )
}
