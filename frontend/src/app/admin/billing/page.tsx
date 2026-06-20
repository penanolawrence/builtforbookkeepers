'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPayments,
  getAccountantPayments,
  getAccountantUsersList,
  receivePayment,
  receiveAccountantPayment,
} from '@/lib/api/admin/billing'
import type { ReceivePaymentData } from '@/lib/api/admin/billing'
import { getClients } from '@/lib/api/admin/clients'
import type { PaymentRecord, AccountantPaymentRecord } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

function fmtAmount(n: number | string) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PER_PAGE = 20

// ── PaymentModal ────────────────────────────────────────────────────────────
// When userId + accountantName are set, records a payment for that accountant
// (no client dropdown). When clientId flow, shows client dropdown.

interface PaymentModalProps {
  clients: { id: string; name: string }[]
  accountants?: { userId: string; name: string }[]
  // Pre-fill for accountant payments
  userId?: string
  accountantName?: string
  pickAccountant?: boolean
  onClose: () => void
  onSuccess: () => void
}

function PaymentModal({ clients, accountants, userId, accountantName, pickAccountant, onClose, onSuccess }: PaymentModalProps) {
  const isPrefilledAccountant = !!userId
  const isAccountantMode      = isPrefilledAccountant || !!pickAccountant

  const [pickedAccountantId, setPickedAccountantId] = useState('')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount]     = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [ref, setRef]           = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const targetAccountantId = userId ?? pickedAccountantId
    if (isAccountantMode && !targetAccountantId) { setError('Please select an accountant.'); return }
    if (!isAccountantMode && !clientId) { setError('Please select a client.'); return }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return }
    if (!ref.trim()) { setError('Reference number is required.'); return }
    setSaving(true)
    const payload: ReceivePaymentData = { amount: Number(amount), dateReceived: date, referenceNumber: ref }
    try {
      if (isAccountantMode) {
        await receiveAccountantPayment(targetAccountantId, payload)
      } else {
        await receivePayment(clientId, payload)
      }
      onSuccess()
    } catch {
      setError('Failed to record payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
          <span className="text-[15px] font-bold text-t-ink">Receive Payment</span>
          <button onClick={onClose} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="p-5 space-y-3.5">
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

            {isPrefilledAccountant ? (
              <div>
                <label className="block text-xs font-semibold text-t-muted mb-1.5">Accountant</label>
                <div className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-surface">
                  {accountantName}
                </div>
              </div>
            ) : pickAccountant ? (
              <div>
                <label className="block text-xs font-semibold text-t-muted mb-1.5">Accountant <span className="text-red-500">*</span></label>
                <select
                  value={pickedAccountantId}
                  onChange={(e) => setPickedAccountantId(e.target.value)}
                  className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                >
                  <option value="">Select accountant…</option>
                  {(accountants ?? []).map((a) => <option key={a.userId} value={a.userId}>{a.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-t-muted mb-1.5">Client <span className="text-red-500">*</span></label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Amount <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.01" min="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Date Received <span className="text-red-500">*</span></label>
              <input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Reference Number <span className="text-red-500">*</span></label>
              <input
                type="text" value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. GCash-0421"
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-t-line">
            <button
              type="button" onClick={onClose}
              className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="text-xs font-semibold px-3.5 py-2 bg-t-primary hover:bg-t-primary-deep text-white rounded-md disabled:opacity-50 transition-colors"
            >
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

type BillingTab = 'clients' | 'accountants'

interface ModalTarget {
  userId?: string
  accountantName?: string
  pickAccountant?: boolean
}

export default function AdminBillingPage() {
  const qc = useQueryClient()

  const [tab, setTab]                         = useState<BillingTab>('clients')
  const [clientFilter, setClientFilter]       = useState('')
  const [accountantFilter, setAccountantFilter] = useState('')
  const [start, setStart]                     = useState('')
  const [end, setEnd]                         = useState('')
  const [page, setPage]                       = useState(1)
  const [modalTarget, setModalTarget]         = useState<ModalTarget | null>(null)
  const [toast, setToast]                     = useState<string | null>(null)
  const [hoveredId, setHoveredId]             = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin-payments', { clientFilter, start, end }],
    queryFn: () => getPayments({
      clientId: clientFilter || undefined,
      start:    start || undefined,
      end:      end || undefined,
    }),
  })

  const { data: acctPayments, isLoading: acctPaymentsLoading } = useQuery({
    queryKey: ['admin-accountant-payments', { accountantFilter, start, end }],
    queryFn: () => getAccountantPayments({
      userId: accountantFilter || undefined,
      start:  start || undefined,
      end:    end || undefined,
    }),
  })

  const { data: accountantUsers } = useQuery({
    queryKey: ['admin-accountant-users'],
    queryFn:  getAccountantUsersList,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn:  () => getClients(),
  })

  const clients           = clientsData?.data ?? []
  const allPayments       = payments ?? []
  const allAcctPayments   = acctPayments ?? []
  const allAccountantUsers = accountantUsers ?? []

  // ── Clients pagination ───────────────────────────────────────────────────
  const total      = allPayments.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const from       = total === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const to         = Math.min(safePage * PER_PAGE, total)
  const pageItems  = allPayments.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE) as PaymentRecord[]

  const now = new Date()

  // Client summary
  const totalReceived = allPayments.reduce((s: number, p: PaymentRecord) => s + Number(p.amount), 0)
  const thisMonth = allPayments
    .filter((p: PaymentRecord) => {
      const d = new Date(p.dateReceived)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s: number, p: PaymentRecord) => s + Number(p.amount), 0)
  const activeClients = new Set(allPayments.map((p: PaymentRecord) => p.companyId)).size

  // Accountant summary
  const acctTotalReceived = allAcctPayments.reduce((s: number, p: AccountantPaymentRecord) => s + Number(p.amount), 0)
  const acctThisMonth = allAcctPayments
    .filter((p: AccountantPaymentRecord) => {
      const d = new Date(p.dateReceived)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s: number, p: AccountantPaymentRecord) => s + Number(p.amount), 0)
  const activeAccountants = new Set(allAcctPayments.map((p: AccountantPaymentRecord) => p.userId)).size

  function fmtCurrency(n: number) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safePage <= 3) return [1, 2, 3, 4, 5]
    if (safePage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2]
  })()

  // ── Tab strip style ──────────────────────────────────────────────────────
  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? 'var(--t-primary)' : 'transparent',
    color:      active ? '#fff' : 'var(--t-muted)',
    transition: 'background 0.14s, color 0.14s',
  })

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Billing' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Billing
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">Payment records</p>
        </div>
        <button
          onClick={() => setModalTarget(tab === 'accountants' ? { pickAccountant: true } : {})}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + Receive Payment
        </button>
      </div>

      {!(tab === 'clients' ? paymentsLoading : acctPaymentsLoading) && (
        <div className="flex gap-[14px] mb-[22px]">
          {tab === 'clients' ? (
            <>
              <SummaryCard label="Total Payments" value={String(allPayments.length)} subnote="clients, all time" />
              <SummaryCard label="Total Received" value={fmtCurrency(totalReceived)} subnote="clients, all time" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
              <SummaryCard label="This Month" value={fmtCurrency(thisMonth)} subnote={`${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`} valueStyle={{ color: 'var(--t-primary)' }} />
              <SummaryCard label="Active Clients" value={String(activeClients)} subnote="with payments on record" />
            </>
          ) : (
            <>
              <SummaryCard label="Total Payments" value={String(allAcctPayments.length)} subnote="accountants, all time" />
              <SummaryCard label="Total Received" value={fmtCurrency(acctTotalReceived)} subnote="accountants, all time" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
              <SummaryCard label="This Month" value={fmtCurrency(acctThisMonth)} subnote={`${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`} valueStyle={{ color: 'var(--t-primary)' }} />
              <SummaryCard label="Active Accountants" value={String(activeAccountants)} subnote="with payments on record" />
            </>
          )}
        </div>
      )}

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>

        {/* Card header with tab strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Billing</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--t-card-alt)', borderRadius: 10, padding: 4 }}>
            <button style={tabStyle(tab === 'clients')} onClick={() => setTab('clients')}>Clients</button>
            <button style={tabStyle(tab === 'accountants')} onClick={() => setTab('accountants')}>Accountants</button>
          </div>
        </div>

        {/* ── CLIENTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'clients' && (() => {
          const COLS = 'minmax(160px, 2fr) 130px 130px 150px minmax(100px, 1fr)'
          const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
            { label: 'Client',        align: 'left',  color: 'var(--t-faint)' },
            { label: 'Amount',        align: 'right', color: 'var(--t-tier-ready-fg)' },
            { label: 'Date Received', align: 'left',  color: 'var(--t-faint)' },
            { label: 'Reference',     align: 'left',  color: 'var(--t-faint)' },
            { label: 'Recorded By',   align: 'left',  color: 'var(--t-faint)' },
          ]

          return (
            <>
              {/* Filter bar */}
              <div className="flex gap-2.5 items-center px-6 py-3 border-b border-t-line flex-wrap">
                <select
                  value={clientFilter}
                  onChange={(e) => { setClientFilter(e.target.value); setPage(1) }}
                  className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  type="date" value={start}
                  onChange={(e) => { setStart(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <span className="text-sm text-t-faint">–</span>
                <input
                  type="date" value={end}
                  onChange={(e) => { setEnd(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <div className="flex-1" />
                <span className="text-[13px] text-t-muted font-medium">{total} payments</span>
              </div>

              {paymentsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
              ) : allPayments.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No payment records found.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align, color }) => (
                      <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                  {pageItems.map((r, i) => {
                    const isHovered = hoveredId === r.id
                    const rowBg = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                    return (
                      <div
                        key={r.id}
                        onMouseEnter={() => setHoveredId(r.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '13px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.companyName ?? r.companyId}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtAmount(r.amount)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{fmtDate(r.dateReceived)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referenceNumber}</span>
                        <span style={{ fontSize: 13, color: 'var(--t-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recordedBy ?? '—'}</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>{from}–{to} of {total} payments</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(totalReceived)}</span>
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}>‹</button>
                        {pageNums.map((pg) => (
                          <button key={pg} onClick={() => setPage(pg)} style={{ width: 28, height: 28, borderRadius: 8, fontSize: 13, fontWeight: pg === safePage ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: pg === safePage ? 'var(--t-primary)' : 'var(--t-card)', color: pg === safePage ? '#fff' : 'var(--t-muted)', border: pg === safePage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)' }}>{pg}</button>
                        ))}
                        {pageNums[pageNums.length - 1] < totalPages && (
                          <>
                            <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t-faint)' }}>…</span>
                            <button onClick={() => setPage(totalPages)} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer' }}>{totalPages}</button>
                          </>
                        )}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}>›</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )
        })()}

        {/* ── ACCOUNTANTS TAB ─────────────────────────────────────────────── */}
        {tab === 'accountants' && (() => {
          const COLS = 'minmax(160px, 2fr) 130px 130px 150px minmax(100px, 1fr)'
          const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
            { label: 'Accountant',    align: 'left',  color: 'var(--t-faint)' },
            { label: 'Amount',        align: 'right', color: 'var(--t-tier-ready-fg)' },
            { label: 'Date Received', align: 'left',  color: 'var(--t-faint)' },
            { label: 'Reference',     align: 'left',  color: 'var(--t-faint)' },
            { label: 'Recorded By',   align: 'left',  color: 'var(--t-faint)' },
          ]
          const acctTotal     = allAcctPayments.length
          const acctTotalAmt  = allAcctPayments.reduce((s, p: AccountantPaymentRecord) => s + Number(p.amount), 0)
          const acctPages     = Math.max(1, Math.ceil(acctTotal / PER_PAGE))
          const acctSafePage  = Math.min(page, acctPages)
          const acctFrom      = acctTotal === 0 ? 0 : (acctSafePage - 1) * PER_PAGE + 1
          const acctTo        = Math.min(acctSafePage * PER_PAGE, acctTotal)
          const acctItems     = allAcctPayments.slice((acctSafePage - 1) * PER_PAGE, acctSafePage * PER_PAGE) as AccountantPaymentRecord[]
          const acctPageNums  = (() => {
            if (acctPages <= 5) return Array.from({ length: acctPages }, (_, i) => i + 1)
            if (acctSafePage <= 3) return [1, 2, 3, 4, 5]
            if (acctSafePage >= acctPages - 2) return [acctPages - 4, acctPages - 3, acctPages - 2, acctPages - 1, acctPages]
            return [acctSafePage - 2, acctSafePage - 1, acctSafePage, acctSafePage + 1, acctSafePage + 2]
          })()

          return (
            <>
              {/* Filter bar */}
              <div className="flex gap-2.5 items-center px-6 py-3 border-b border-t-line flex-wrap">
                <select
                  value={accountantFilter}
                  onChange={(e) => { setAccountantFilter(e.target.value); setPage(1) }}
                  className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
                >
                  <option value="">All Accountants</option>
                  {allAccountantUsers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input
                  type="date" value={start}
                  onChange={(e) => { setStart(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <span className="text-sm text-t-faint">–</span>
                <input
                  type="date" value={end}
                  onChange={(e) => { setEnd(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <div className="flex-1" />
                <span className="text-[13px] text-t-muted font-medium">{acctTotal} payments</span>
              </div>

              {acctPaymentsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
              ) : allAcctPayments.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No accountant payments found.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align, color }) => (
                      <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                  {acctItems.map((r, i) => {
                    const isHovered = hoveredId === r.id
                    const rowBg = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                    return (
                      <div
                        key={r.id}
                        onMouseEnter={() => setHoveredId(r.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '13px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.accountantName ?? r.userId}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtAmount(r.amount)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{fmtDate(r.dateReceived)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referenceNumber}</span>
                        <span style={{ fontSize: 13, color: 'var(--t-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recordedBy ?? '—'}</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>{acctFrom}–{acctTo} of {acctTotal} payments</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(acctTotalAmt)}</span>
                    </div>
                    {acctPages > 1 && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={acctSafePage === 1} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: acctSafePage === 1 ? 0.4 : 1 }}>‹</button>
                        {acctPageNums.map((pg) => (
                          <button key={pg} onClick={() => setPage(pg)} style={{ width: 28, height: 28, borderRadius: 8, fontSize: 13, fontWeight: pg === acctSafePage ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: pg === acctSafePage ? 'var(--t-primary)' : 'var(--t-card)', color: pg === acctSafePage ? '#fff' : 'var(--t-muted)', border: pg === acctSafePage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)' }}>{pg}</button>
                        ))}
                        <button onClick={() => setPage((p) => Math.min(acctPages, p + 1))} disabled={acctSafePage === acctPages} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: acctSafePage === acctPages ? 0.4 : 1 }}>›</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )
        })()}
      </div>

      {/* Payment modal */}
      {modalTarget !== null && (
        <PaymentModal
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          accountants={allAccountantUsers.map((a) => ({ userId: a.id, name: a.name }))}
          userId={modalTarget.userId}
          accountantName={modalTarget.accountantName}
          pickAccountant={modalTarget.pickAccountant}
          onClose={() => setModalTarget(null)}
          onSuccess={() => {
            setModalTarget(null)
            if (modalTarget.userId || modalTarget.pickAccountant) {
              qc.invalidateQueries({ queryKey: ['admin-accountant-payments'] })
            } else {
              qc.invalidateQueries({ queryKey: ['admin-payments'] })
            }
            showToast('Payment recorded.')
          }}
        />
      )}
    </div>
  )
}
