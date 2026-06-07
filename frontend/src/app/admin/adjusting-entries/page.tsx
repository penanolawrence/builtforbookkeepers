'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getEntries } from '@/lib/api/adjusting-entries'
import type { AdjustingEntry } from '@/types/adjusting-entry'
import { AdjustingEntriesTable } from '@/components/adjusting-entries/AdjustingEntriesTable'
import { NewEntryModal } from '@/components/adjusting-entries/NewEntryModal'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

export default function AdminAdjustingEntriesPage() {
  const [clientFilter, setClientFilter]         = useState('all')
  const [statusFilter, setStatusFilter]         = useState('all')
  const [accountantFilter, setAccountantFilter] = useState('all')
  const [newEntryOpen, setNewEntryOpen]         = useState(false)
  const [viewEntryId, setViewEntryId]           = useState<string | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['adjusting-entries', 'all'],
    queryFn: () => getEntries({ status: 'all' }),
  })

  const allEntries = (entries ?? []) as AdjustingEntry[]

  const uniqueAccountants = useMemo(() => {
    const names = allEntries.map((e) => e.createdBy).filter(Boolean) as string[]
    return Array.from(new Set(names)).sort()
  }, [allEntries])

  const uniqueClients = useMemo(() => {
    const seen = new Map<string, string>()
    allEntries.forEach((e) => { if (e.companyId && e.companyName) seen.set(e.companyId, e.companyName) })
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allEntries])

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (statusFilter    !== 'all' && e.status    !== statusFilter)    return false
      if (accountantFilter !== 'all' && e.createdBy !== accountantFilter) return false
      if (clientFilter    !== 'all' && e.companyId !== clientFilter)    return false
      return true
    })
  }, [allEntries, statusFilter, accountantFilter, clientFilter])

  const pendingCount  = allEntries.filter((e) => e.status === 'PENDING').length
  const approvedCount = allEntries.filter((e) => e.status === 'APPROVED').length

  const selectCls = 'h-10 w-full pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none'

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Adjusting Entries' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Adjusting Entries
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">Review accountant submissions and create your own</p>
        </div>
        <button
          onClick={() => setNewEntryOpen(true)}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + New Entry
        </button>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total Entries" value={String(allEntries.length)} subnote="all statuses" />
          <SummaryCard label="Pending" value={String(pendingCount)} subnote="awaiting approval" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
          <SummaryCard label="Approved" value={String(approvedCount)} subnote="this period" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
        </div>
      )}

      {/* Filter bar */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="relative">
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={selectCls}>
            <option value="all">All Clients</option>
            {uniqueClients.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          {clientFilter !== 'all' && (
            <button type="button" onClick={() => setClientFilter('all')} aria-label="Clear client filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink">
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {statusFilter !== 'all' && (
            <button type="button" onClick={() => setStatusFilter('all')} aria-label="Clear status filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink">
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={accountantFilter} onChange={(e) => setAccountantFilter(e.target.value)} className={selectCls}>
            <option value="all">All Accountants</option>
            {uniqueAccountants.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {accountantFilter !== 'all' && (
            <button type="button" onClick={() => setAccountantFilter('all')} aria-label="Clear accountant filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink">
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}
        </div>
      </div>

      <AdjustingEntriesTable
        entries={filtered}
        isLoading={isLoading}
        onRowClick={(e) => setViewEntryId(e.id)}
        showAccountant
        renderRowActions={(e) => (
          <button
            onClick={() => setViewEntryId(e.id)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
              e.status === 'PENDING'
                ? 'bg-t-primary hover:bg-t-primary-deep text-white'
                : 'border border-t-line text-t-ink hover:bg-t-surface'
            }`}
          >
            Review
          </button>
        )}
      />

      <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} isAdmin />
      <NewEntryModal
        open={!!viewEntryId}
        onClose={() => setViewEntryId(null)}
        viewEntryId={viewEntryId}
        isAdmin
      />
    </div>
  )
}
