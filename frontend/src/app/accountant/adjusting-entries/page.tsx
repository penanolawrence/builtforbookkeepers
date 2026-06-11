'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getEntries } from '@/lib/api/adjusting-entries'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import type { AdjustingEntry } from '@/types/adjusting-entry'
import type { ClientProfile } from '@/types/admin'
import { AdjustingEntriesTable } from '@/components/adjusting-entries/AdjustingEntriesTable'
import { NewEntryModal } from '@/components/adjusting-entries/NewEntryModal'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

export default function AccountantAdjustingEntriesPage() {
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [viewEntryId, setViewEntryId]   = useState<string | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['adjusting-entries', clientFilter, statusFilter],
    queryFn: () => getEntries({
      clientId: clientFilter !== 'all' ? clientFilter : undefined,
      status:   statusFilter !== 'all' ? statusFilter : undefined,
    }),
  })

  const { data: clientsPage } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients({ per_page: 100 }),
  })
  const clients = clientsPage?.data ?? []

  const allEntries    = (entries ?? []) as AdjustingEntry[]
  const pendingCount  = allEntries.filter((e) => e.status === 'PENDING').length
  const approvedCount = allEntries.filter((e) => e.status === 'APPROVED').length

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/accountant' }, { label: 'Adjusting Entries' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Adjusting Entries
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">All entries for your assigned clients</p>
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
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="relative">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-10 w-full pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="all">All Clients</option>
            {(clients ?? []).map((c: ClientProfile) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {clientFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setClientFilter('all')}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink"
              aria-label="Clear client filter"
            >
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink"
              aria-label="Clear status filter"
            >
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}
        </div>
      </div>

      <AdjustingEntriesTable
        entries={allEntries}
        isLoading={isLoading}
        onRowClick={(e) => setViewEntryId(e.id)}
        showReference
      />

      <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
      <NewEntryModal
        open={!!viewEntryId}
        onClose={() => setViewEntryId(null)}
        viewEntryId={viewEntryId}
      />
    </div>
  )
}
