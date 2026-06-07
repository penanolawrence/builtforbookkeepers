'use client'

import { useState } from 'react'
import type { AdjustingEntry, EntryStatus } from '@/types/adjusting-entry'
import { formatDate } from '@/lib/utils/formatDate'

const STATUS_TIER: Record<EntryStatus, string> = {
  PENDING:  'check',
  APPROVED: 'ready',
  REJECTED: 'review',
  DRAFT:    'pending',
}
const STATUS_LABEL: Record<EntryStatus, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DRAFT:    'Draft',
}

interface Props {
  entries: AdjustingEntry[]
  isLoading: boolean
  onRowClick: (entry: AdjustingEntry) => void
  showAccountant?: boolean
  showReference?: boolean
  renderRowActions?: (entry: AdjustingEntry) => React.ReactNode
}

export function AdjustingEntriesTable({
  entries,
  isLoading,
  onRowClick,
  showAccountant = false,
  showReference = false,
  renderRowActions,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const pendingCount = entries.filter((e) => e.status === 'PENDING').length

  const colWidths: string[] = [
    '110px',              // Type
    'minmax(140px, 2fr)', // Client
    'minmax(100px, 1fr)', // Description
    '100px',              // Date
  ]
  if (showAccountant)   colWidths.push('minmax(100px, 1fr)')
  if (showReference)    colWidths.push('120px')
  colWidths.push('120px')                                     // Status
  if (renderRowActions) colWidths.push('90px')

  const COLS = colWidths.join(' ')

  const headers: { label: string; align: 'left' | 'right' | 'center' }[] = [
    { label: 'Type',        align: 'left'   },
    { label: 'Client',      align: 'left'   },
    { label: 'Description', align: 'left'   },
    { label: 'Date',        align: 'left'   },
  ]
  if (showAccountant)   headers.push({ label: 'Accountant', align: 'left' })
  if (showReference)    headers.push({ label: 'Reference',  align: 'left' })
  headers.push({ label: 'Status', align: 'center' })
  if (renderRowActions) headers.push({ label: '',           align: 'left' })

  return (
    <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Adjusting Entries</span>
        <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
          {entries.length}
        </span>
        {pendingCount > 0 && (
          <span style={{ background: 'var(--t-tier-check-bg)', color: 'var(--t-tier-check-fg)', border: '1px solid var(--t-tier-check-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {pendingCount} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No adjusting entries found.</div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
            {headers.map(({ label, align }) => (
              <span key={label || '__actions'} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)', textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            ))}
          </div>

          {/* Data rows */}
          {entries.map((entry, i) => {
            const tier      = STATUS_TIER[entry.status] ?? 'pending'
            const label     = STATUS_LABEL[entry.status] ?? entry.status
            const flagTier  = entry.status === 'REJECTED' ? 'review' : entry.status === 'PENDING' ? 'check' : null
            const isHovered = hoveredId === entry.id
            const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

            return (
              <div
                key={entry.id}
                onClick={() => onRowClick(entry)}
                onMouseEnter={() => setHoveredId(entry.id)}
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
                {/* Type */}
                <div style={{ display: 'flex' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'var(--t-chip-bg)', color: 'var(--t-muted)', border: '1px solid var(--t-line)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                  }}>
                    {entry.type}
                  </span>
                </div>

                {/* Client */}
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {entry.companyName}
                </span>

                {/* Description */}
                <span style={{ fontSize: 13, color: 'var(--t-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.memo || '—'}
                </span>

                {/* Date */}
                <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                  {formatDate(entry.date)}
                </span>

                {/* Accountant (admin-only) */}
                {showAccountant && (
                  <span style={{ fontSize: 13, color: 'var(--t-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.createdBy ?? '—'}
                  </span>
                )}

                {/* Reference (accountant-only) */}
                {showReference && (
                  <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.refNumber || '—'}
                  </span>
                )}

                {/* Status */}
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

                {/* Actions (admin-only) */}
                {renderRowActions && (
                  <div onClick={(ev) => ev.stopPropagation()}>
                    {renderRowActions(entry)}
                  </div>
                )}
              </div>
            )
          })}

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
