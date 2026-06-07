'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import type { AccountStatus } from '@/types/auth'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { ClientModal } from '@/components/admin/ClientModal'

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

export default function AdminClientsPage() {
  const [search, setSearch]           = useState('')
  const [status, setStatus]           = useState('')
  const [accountantId, setAccountantId] = useState('')
  const [page, setPage]               = useState(1)
  const [hoveredId, setHoveredId]     = useState<string | null>(null)
  const [modal, setModal] = useState<
    | { mode: 'create' }
    | { mode: 'detail'; clientId: string }
    | null
  >(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', { search, status, accountantId, page }],
    queryFn: () => getClients({
      search: search || undefined,
      status: status || undefined,
      accountantId: accountantId || undefined,
      page,
    }),
  })

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
  })

  const clients = data?.data ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0

  const activeCount    = clients.filter((c) => c.clientStatus === 'ACTIVE').length
  const overdueCount   = clients.filter((c) => c.clientStatus === 'OVERDUE').length
  const suspendedCount = clients.filter((c) => c.clientStatus === 'SUSPENDED').length
  const perPage = pagination?.perPage ?? 10
  const currentPage = pagination?.currentPage ?? 1
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  })()

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Clients' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Clients
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">{isLoading ? '…' : `${total} total clients`}</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + New Client
        </button>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total" value={String(total)} subnote="all clients" />
          <SummaryCard label="Active" value={String(activeCount)} subnote="in good standing" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
          <SummaryCard label="Overdue" value={String(overdueCount)} subnote="payment overdue" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
          <SummaryCard label="Suspended" value={String(suspendedCount)} subnote="access restricted" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2.5 items-center mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Search business name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="h-10 px-3.5 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-ink bg-t-card outline-none w-56 focus:border-t-primary transition-colors"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={accountantId}
          onChange={(e) => { setAccountantId(e.target.value); setPage(1) }}
          className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
        >
          <option value="">All Accountants</option>
          {(accountants ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-[13px] text-t-muted font-medium">{total} clients</span>
      </div>

      {/* Table card */}
      {(() => {
        const COLS = 'minmax(160px, 2fr) 80px 90px minmax(120px, 1fr) 110px'

        const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
          { label: 'Business Name', align: 'left',   color: 'var(--t-faint)' },
          { label: 'VAT',           align: 'left',   color: 'var(--t-faint)' },
          { label: 'Plan',          align: 'left',   color: 'var(--t-faint)' },
          { label: 'Accountant',    align: 'left',   color: 'var(--t-faint)' },
          { label: 'Status',        align: 'center', color: 'var(--t-faint)' },
        ]

        const suspendedCount = clients.filter((c) => c.clientStatus === 'SUSPENDED').length

        return (
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Clients</span>
              <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                {total}
              </span>
              {suspendedCount > 0 && (
                <span style={{ background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)', border: '1px solid var(--t-tier-review-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                  {suspendedCount} suspended
                </span>
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
            ) : clients.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No clients found.</div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                  {COL_HEADERS.map(({ label, align, color }) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Data rows */}
                {clients.map((c, i) => {
                  const tier      = STATUS_TIER[c.clientStatus] ?? 'pending'
                  const label     = STATUS_LABEL[c.clientStatus] ?? c.clientStatus
                  const flagTier  = c.clientStatus === 'SUSPENDED' ? 'review' : c.clientStatus === 'OVERDUE' ? 'check' : null
                  const isHovered = hoveredId === c.clientId
                  const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

                  return (
                    <div
                      key={c.clientId}
                      onClick={() => setModal({ mode: 'detail', clientId: c.id })}
                      onMouseEnter={() => setHoveredId(c.clientId)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                        padding: '13px 24px', alignItems: 'center',
                        borderBottom: '1px solid var(--t-line-soft)',
                        cursor: 'pointer', transition: 'background 0.14s',
                        background: rowBg,
                        boxShadow: flagTier ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)` : 'inset 3px 0 0 transparent',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                        {c.birType === 'vat' ? 'VAT' : 'Non-VAT'}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                        {c.plan}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.accountantName ?? '—'}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                          background: `var(--t-tier-${tier}-bg)`,
                          color:      `var(--t-tier-${tier}-fg)`,
                          border:     `1px solid var(--t-tier-${tier}-ring)`,
                        }}>
                          {label}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Footer — entry count + pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
                    {from}–{to} of {total} clients
                  </span>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
                      >‹</button>
                      {pageNums.map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          style={{
                            width: 28, height: 28, borderRadius: 8, fontSize: 13, fontWeight: pg === currentPage ? 700 : 500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            background: pg === currentPage ? 'var(--t-primary)' : 'var(--t-card)',
                            color: pg === currentPage ? '#fff' : 'var(--t-muted)',
                            border: pg === currentPage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)',
                          }}
                        >{pg}</button>
                      ))}
                      {pageNums[pageNums.length - 1] < totalPages && (
                        <>
                          <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t-faint)' }}>…</span>
                          <button onClick={() => setPage(totalPages)} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer' }}>{totalPages}</button>
                        </>
                      )}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
                      >›</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })()}
      {modal && (
        <ClientModal
          {...(modal.mode === 'create'
            ? {
                mode: 'create',
                onClose: () => setModal(null),
                onCreated: (id) => setModal({ mode: 'detail', clientId: id }),
              }
            : {
                mode: 'detail',
                clientId: modal.clientId,
                onClose: () => setModal(null),
              })}
        />
      )}
    </div>
  )
}
