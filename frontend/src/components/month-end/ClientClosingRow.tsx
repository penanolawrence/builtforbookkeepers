'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClientTimeline } from '@/lib/api/period-closings'
import { MonthPill } from './MonthPill'
import { PeriodClosePanel } from './PeriodClosePanel'
import type { ClientClosingSummary, MonthEntry } from '@/types/period-closing'

interface ClientClosingRowProps {
  client: ClientClosingSummary
}

const STATUS_BADGE: Record<string, { label: string | ((c: ClientClosingSummary) => string); className: string }> = {
  ready: {
    label:     'Ready to Close',
    className: 'bg-[var(--t-tier-ready-bg)] text-[var(--t-tier-ready-fg)] border-[var(--t-tier-ready-ring)]',
  },
  blocked: {
    label:     (c: ClientClosingSummary) => c.pendingDocs > 0 ? `${c.pendingDocs} docs pending` : 'AJEs pending',
    className: 'bg-[var(--t-tier-check-bg)] text-[var(--t-tier-check-fg)] border-[var(--t-tier-check-ring)]',
  },
  up_to_date: {
    label:     'Up to date',
    className: 'bg-t-surface text-t-muted border-t-line',
  },
  future: {
    label:     'Not started',
    className: 'bg-[var(--t-surface)] text-[var(--t-muted)] border-[var(--t-line)]',
  },
  closed: {
    label:     'Closed',
    className: 'bg-t-surface text-t-muted border-t-line',
  },
}

function badgeLabel(client: ClientClosingSummary): string {
  const def = STATUS_BADGE[client.status]
  if (!def) return client.status
  return typeof def.label === 'function' ? def.label(client) : def.label
}

export function ClientClosingRow({ client }: ClientClosingRowProps) {
  const [expanded, setExpanded]       = useState(false)
  const [activeMonth, setActiveMonth] = useState<MonthEntry | null>(null)

  const { data: timeline, isError: timelineError } = useQuery({
    queryKey: ['period-closing-timeline', client.companyId],
    queryFn:  () => getClientTimeline(client.companyId),
    enabled:  expanded,
  })

  const badge = STATUS_BADGE[client.status] ?? STATUS_BADGE.up_to_date

  return (
    <>
      {/* Main row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="grid grid-cols-[200px_120px_120px_140px_32px] md:grid-cols-[1fr_140px_140px_160px_40px] cursor-pointer transition-colors"
        style={{
          columnGap: 16,
          padding: '14px 24px',
          alignItems: 'center',
          borderBottom: '1px solid var(--t-line-soft)',
          background: expanded ? 'var(--t-surface)' : undefined,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t-ink)' }}>{client.companyName}</div>
          <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>{client.accountantName ?? '—'}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--t-ink)' }}>
          {client.lastClosed ?? <span style={{ color: 'var(--t-faint)' }}>—</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--t-ink)' }}>
          {client.nextPeriod ?? <span style={{ color: 'var(--t-faint)' }}>—</span>}
        </div>
        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${badge.className}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
            {badgeLabel(client)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <svg
            width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.2}
            style={{ color: 'var(--t-faint)', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Timeline row (expanded) */}
      {expanded && (
        <div style={{
          background: 'var(--t-surface)',
          borderBottom: '1px solid var(--t-line-soft)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-muted)', marginRight: 8, whiteSpace: 'nowrap' }}>
            Timeline
          </span>
          {timelineError ? (
            <span style={{ fontSize: 13, color: 'var(--t-tier-check-fg)' }}>Failed to load timeline.</span>
          ) : timeline ? timeline.map((m, i) => (
            <div key={`${m.year}-${m.month}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && (
                <div style={{ width: 20, height: 1, background: 'var(--t-line)', flexShrink: 0 }} />
              )}
              <MonthPill
                month={m}
                isActive={activeMonth?.year === m.year && activeMonth?.month === m.month}
                onClick={m.status === 'ready' ? () => setActiveMonth(m) : undefined}
              />
            </div>
          )) : (
            <span style={{ fontSize: 13, color: 'var(--t-faint)' }}>Loading…</span>
          )}
        </div>
      )}

      {/* Side panel */}
      {activeMonth && (
        <PeriodClosePanel
          client={client}
          month={activeMonth}
          onClose={() => setActiveMonth(null)}
        />
      )}
    </>
  )
}
