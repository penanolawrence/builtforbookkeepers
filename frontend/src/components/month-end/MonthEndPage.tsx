'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPeriodClosingList } from '@/lib/api/period-closings'
import { getAccountants } from '@/lib/api/admin/accountants'
import { ClientClosingRow } from './ClientClosingRow'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import type { MonthStatus } from '@/types/period-closing'

const PAGE_SIZE = 10

interface MonthEndPageProps {
  showAccountantFilter: boolean
}

type StatusFilter = 'all' | 'ready' | 'blocked' | 'up_to_date'

export function MonthEndPage({ showAccountantFilter }: MonthEndPageProps) {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [accountantId, setAccountantId] = useState('')
  const [page, setPage]                 = useState(0)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['period-closings', { accountantId }],
    queryFn:  () => getPeriodClosingList({ accountantId: accountantId || undefined }),
  })

  const { data: accountants = [] } = useQuery({
    queryKey: ['admin-accountants'],
    queryFn:  () => getAccountants(),
    enabled:  showAccountantFilter,
  })

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search && !c.companyName.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
  }, [clients, search, statusFilter])

  useEffect(() => { setPage(0) }, [search, statusFilter, accountantId])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages - 1)
  const paginated  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const from       = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const to         = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',        label: 'All'       },
    { value: 'ready',      label: 'Ready'      },
    { value: 'blocked',    label: 'Blocked'    },
    { value: 'up_to_date', label: 'Up to date' },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb
        crumbs={[
          { label: 'Dashboard', href: showAccountantFilter ? '/admin' : '/accountant' },
          { label: 'Month-End Closing' },
        ]}
      />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Month-End Closing
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            Close income and expense accounts to Income Summary per client, per month.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2.5 mb-5">
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-faint)', pointerEvents: 'none' }}
            width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 pr-4 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] text-t-ink"
            style={{ minWidth: 220, outline: 'none' }}
          />
        </div>

        {showAccountantFilter && (
          <select
            value={accountantId}
            onChange={(e) => setAccountantId(e.target.value)}
            className="h-10 w-full md:w-auto pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="">All Accountants</option>
            {accountants.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '7px 13px', borderRadius: 7, border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === tab.value ? 'var(--t-card)' : 'transparent',
                color:      statusFilter === tab.value ? 'var(--t-ink)' : 'var(--t-muted)',
                boxShadow:  statusFilter === tab.value ? '0 1px 3px rgba(42,28,60,.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>
            Clients
          </span>
          <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {filtered.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {/* Column headers */}
          <div
            className="grid grid-cols-[200px_120px_120px_140px_32px] md:grid-cols-[1fr_140px_140px_160px_40px]"
            style={{ columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}
          >
            {['Client', 'Last Closed', 'Next Period', 'Status', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-faint)', whiteSpace: 'nowrap' }}>
                {h}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No clients found.</div>
          ) : (
            paginated.map((client) => (
              <ClientClosingRow key={client.companyId} client={client} />
            ))
          )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--t-line)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t-faint)' }}>
              {from}–{to} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-card)', fontSize: 12.5, fontWeight: 600, color: 'var(--t-ink)', cursor: safePage === 0 ? 'not-allowed' : 'pointer', opacity: safePage === 0 ? 0.4 : 1, fontFamily: 'inherit' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-card)', fontSize: 12.5, fontWeight: 600, color: 'var(--t-ink)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages - 1 ? 0.4 : 1, fontFamily: 'inherit' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
