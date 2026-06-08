'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getQueue } from '@/lib/api/queue'
import type { QueueItem } from '@/types/queue'
import type { ClientProfile } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { Search, Users } from 'lucide-react'
import { ClientDetailModal } from '@/components/accountant/ClientDetailModal'

function queueCountsForClient(clientId: string, items: QueueItem[]) {
  const rows = items.filter((i) => i.clientId === clientId)
  return {
    red:    rows.filter((i) => i.flag === 'RED').length,
    yellow: rows.filter((i) => i.flag === 'YELLOW').length,
    green:  rows.filter((i) => i.flag === 'GREEN').length,
  }
}

export default function AccountantClientsPage() {
  const [search,         setSearch]         = useState('')
  const [hoveredId,      setHoveredId]      = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients(),
  })

  const { data: queue } = useQuery({
    queryKey: ['accountant-queue'],
    queryFn: () => getQueue(),
  })

  const filtered = (clients ?? []).filter((c: ClientProfile) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const needAttention = (clients ?? []).filter((c: ClientProfile) => {
    const counts = queueCountsForClient(c.id, queue ?? [])
    return counts.red > 0
  }).length
  const pendingReview = (clients ?? []).reduce((sum: number, c: ClientProfile) => {
    const counts = queueCountsForClient(c.id, queue ?? [])
    return sum + counts.red + counts.yellow
  }, 0)
  const allClear = (clients ?? []).filter((c: ClientProfile) => {
    const counts = queueCountsForClient(c.id, queue ?? [])
    return counts.red === 0 && counts.yellow === 0 && counts.green > 0
  }).length

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/accountant' }, { label: 'My Clients' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            My Clients
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${clients?.length ?? 0} assigned clients`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-[14px] mb-[22px]">
          <SummaryCard label="Total Clients" value={String(clients?.length ?? 0)} subnote="assigned to you" />
          <SummaryCard label="Need Attention" value={String(needAttention)} subnote="have RED flags" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
          <SummaryCard label="Pending Review" value={String(pendingReview)} subnote="total flagged items" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
          <SummaryCard label="All Clear" value={String(allClear)} subnote="no open flags" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
        </div>
      )}

      {/* Search + count */}
      <div className="flex gap-2.5 items-center mb-5">
        <div className="flex items-center gap-2 h-10 px-3.5 border-[1.5px] border-t-line rounded-[11px] bg-t-card w-full md:w-72">
          <Search className="h-4 w-4 text-t-faint flex-none" />
          <input
            type="text"
            placeholder="Search business name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 outline-none bg-transparent text-[13.5px] text-t-ink w-full"
          />
        </div>
        <div className="flex-1" />
        <span className="text-[13px] text-t-muted font-medium">{filtered.length} of {clients?.length ?? 0} clients</span>
      </div>

      {/* Table card */}
      {(() => {
        const COLS = 'minmax(200px, 3fr) 90px 100px 70px 70px 70px'

        const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
          { label: 'Business Name', align: 'left',   color: 'var(--t-faint)' },
          { label: 'VAT',           align: 'left',   color: 'var(--t-faint)' },
          { label: 'Plan',          align: 'left',   color: 'var(--t-faint)' },
          { label: 'RED',           align: 'center', color: 'var(--t-tier-review-fg)' },
          { label: 'YEL',           align: 'center', color: 'var(--t-tier-check-fg)' },
          { label: 'GRN',           align: 'center', color: 'var(--t-tier-ready-fg)' },
        ]

        function CountBadge({ n, tier }: { n: number; tier: 'review' | 'check' | 'ready' }) {
          if (n === 0) return <span style={{ color: 'var(--t-faint)', fontSize: 13 }}>—</span>
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              background: `var(--t-tier-${tier}-bg)`,
              color:      `var(--t-tier-${tier}-fg)`,
              border:     `1px solid var(--t-tier-${tier}-ring)`,
              minWidth:   28,
            }}>{n}</span>
          )
        }

        const needsAttention = filtered.filter((c: ClientProfile) =>
          queueCountsForClient(c.id, queue ?? []).red > 0
        ).length

        return (
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
              <Users size={18} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>My Clients</span>
              <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                {filtered.length}
              </span>
              {needsAttention > 0 && (
                <span style={{ background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)', border: '1px solid var(--t-tier-review-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                  {needsAttention} need attention
                </span>
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No clients found.</div>
            ) : (
              <>
                {/* ── Desktop table ── */}
                <div className="hidden md:block">
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align, color }) => (
                      <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                  {filtered.map((c: ClientProfile, i: number) => {
                    const counts    = queueCountsForClient(c.id, queue ?? [])
                    const isFlagged = counts.red > 0
                    const isHovered = hoveredId === c.id
                    const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                          display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                          padding: '13px 24px', alignItems: 'center',
                          borderBottom: '1px solid var(--t-line-soft)',
                          cursor: 'pointer', transition: 'background 0.14s',
                          background: rowBg,
                          boxShadow: isFlagged ? 'inset 3px 0 0 var(--t-tier-review-fg)' : 'inset 3px 0 0 transparent',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>{c.name}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{c.birType === 'vat' ? 'VAT' : 'Non-VAT'}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{c.plan}</span>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.red}    tier="review" /></div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.yellow} tier="check"  /></div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.green}  tier="ready"  /></div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Mobile cards ── */}
                <div className="block md:hidden">
                  {filtered.map((c: ClientProfile, i: number) => {
                    const counts    = queueCountsForClient(c.id, queue ?? [])
                    const isFlagged = counts.red > 0
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer"
                        style={{
                          borderBottom: '1px solid var(--t-line-soft)',
                          background: i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent',
                          boxShadow: isFlagged ? 'inset 3px 0 0 var(--t-tier-review-fg)' : 'inset 3px 0 0 transparent',
                        }}
                      >
                        <div className="flex flex-col gap-[3px] min-w-0 pr-3">
                          <span className="font-bold text-[13.5px] text-t-ink truncate">{c.name}</span>
                          <span className="text-[12px] text-t-muted capitalize">{c.birType === 'vat' ? 'VAT' : 'Non-VAT'} · {c.plan}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <CountBadge n={counts.red}    tier="review" />
                          <CountBadge n={counts.yellow} tier="check"  />
                          <CountBadge n={counts.green}  tier="ready"  />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })()}

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}
