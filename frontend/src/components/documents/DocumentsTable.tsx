'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Document, DocumentStatus } from '@/types/document'
import { formatCurrency } from '@/lib/utils/formatCurrency'

const COLS = 'minmax(140px, 2fr) 90px 100px 110px 110px 130px minmax(100px, 1fr)'

type Tier = 'pending' | 'check' | 'review' | 'ready'

const STATUS: Record<DocumentStatus, { label: string; tier: Tier }> = {
  PROCESSING: { label: 'Processing', tier: 'pending' },
  PARKED:     { label: 'In Review',  tier: 'check'   },
  RETURNED:   { label: 'Returned',   tier: 'review'  },
  APPROVED:   { label: 'Approved',   tier: 'ready'   },
  REJECTED:   { label: 'Rejected',   tier: 'review'  },
  CANCELLED:  { label: 'Withdrawn',  tier: 'pending' },
}

function tierStyle(tier: Tier): CSSProperties {
  return {
    background: `var(--t-tier-${tier}-bg)`,
    color:      `var(--t-tier-${tier}-fg)`,
    border:     `1px solid var(--t-tier-${tier}-ring)`,
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function getNoteText(doc: Document): { text: string; color: string } {
  if (doc.status === 'RETURNED' && doc.returnNote) {
    const t = doc.returnNote
    return { text: t.length > 60 ? t.slice(0, 60) + '…' : t, color: 'var(--t-tier-review-fg)' }
  }
  if (doc.status === 'REJECTED' && doc.rejectionReason) {
    const t = doc.rejectionReason
    return { text: t.length > 60 ? t.slice(0, 60) + '…' : t, color: 'var(--t-faint)' }
  }
  if (doc.status === 'PARKED')     return { text: 'Awaiting accountant review', color: 'var(--t-faint)' }
  if (doc.status === 'PROCESSING') return { text: 'Processing…',                color: 'var(--t-faint)' }
  if (doc.status === 'CANCELLED')  return { text: 'Withdrawn by client',        color: 'var(--t-faint)' }
  return { text: '', color: 'var(--t-faint)' }
}

interface Props {
  docs: Document[]
  onRowClick: (doc: Document) => void
  totalDocs?: number
  lastPage?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  sortDir?: 'asc' | 'desc'
  onSortToggle?: () => void
  title?: string
  subtitle?: string
  inReview?: number
}

const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
  { label: 'Reference', align: 'left',   color: 'var(--t-faint)' },
  { label: 'Source',    align: 'left',   color: 'var(--t-faint)' },
  { label: 'Date',      align: 'left',   color: 'var(--t-faint)' },
  { label: 'Inflow',    align: 'right',  color: 'var(--t-tier-ready-fg)' },
  { label: 'Outflow',   align: 'right',  color: 'var(--t-tier-review-fg)' },
  { label: 'Status',    align: 'center', color: 'var(--t-faint)' },
  { label: 'Note',      align: 'left',   color: 'var(--t-faint)' },
]

export function DocumentsTable({ docs, totalDocs = docs.length, lastPage = 1, page = 1, perPage = docs.length || 1, onPageChange = () => {}, onRowClick, sortDir, onSortToggle, title = 'Documents', subtitle, inReview = 0 }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const totalPages = Math.max(1, lastPage)
  const pageStart  = (page - 1) * perPage
  const pageDocs   = docs

  if (totalDocs === 0) return null

  const totalInflow  = pageDocs.reduce((s, d) => s + d.inflow,  0)
  const totalOutflow = pageDocs.reduce((s, d) => s + d.outflow, 0)

  return (
    <div style={{
      background:   'var(--t-card)',
      border:       '1px solid var(--t-line)',
      borderRadius: 20,
      overflow:     'hidden',
      boxShadow:    'var(--t-shadow)',
    }}>

      {/* ── Card header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--t-faint)' }}>{subtitle}</span>
        )}
        <span style={{
          background:   'var(--t-primary-soft)',
          color:        'var(--t-primary)',
          border:       '1px solid var(--t-line)',
          borderRadius: 999,
          padding:      '2px 9px',
          fontSize:     11.5,
          fontWeight:   800,
        }}>
          {totalDocs}
        </span>
        {inReview > 0 && (
          <span style={{
            background:   'var(--t-tier-check-bg)',
            color:        'var(--t-tier-check-fg)',
            border:       '1px solid var(--t-tier-check-ring)',
            borderRadius: 999,
            padding:      '2px 9px',
            fontSize:     11.5,
            fontWeight:   800,
          }}>
            {inReview} in review
          </span>
        )}
      </div>

      {/* ── Desktop table — hidden on mobile ── */}
      <div className="hidden md:block">

        {/* ── Column headers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
          {COL_HEADERS.map(({ label, align, color }) =>
            label === 'Date' ? (
              <button
                key={label}
                onClick={onSortToggle}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                  color, textAlign: align as CSSProperties['textAlign'],
                  background: 'none', border: 'none', padding: 0, cursor: onSortToggle ? 'pointer' : 'default',
                }}
              >
                {label}
                <span style={{ opacity: 0.7 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
              </button>
            ) : (
              <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align }}>
                {label}
              </span>
            )
          )}
        </div>

        {/* ── Data rows ── */}
        {pageDocs.map((doc, i) => {
          const { label: statusLabel, tier } = STATUS[doc.status]
          const { text: note, color: noteColor } = getNoteText(doc)
          const ref         = doc.refNumber ?? `#${doc.id.slice(0, 8)}`
          const isProcessing = doc.status === 'PROCESSING'
          const flagTier    = doc.status === 'RETURNED' || doc.status === 'REJECTED' ? 'review'
                            : doc.status === 'PARKED' ? 'check'
                            : null

          const isHovered = hoveredId === doc.id
          const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

          return (
            <div
              key={doc.id}
              onClick={() => onRowClick(doc)}
              onMouseEnter={() => setHoveredId(doc.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display:              'grid',
                gridTemplateColumns:  COLS,
                columnGap:            16,
                padding:              '13px 24px',
                alignItems:           'center',
                borderBottom:         '1px solid var(--t-line-soft)',
                cursor:               'pointer',
                transition:           'background 0.14s',
                background:           rowBg,
                boxShadow:            flagTier
                  ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)`
                  : 'inset 3px 0 0 transparent',
              }}
            >
              {/* Reference */}
              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                {ref}
              </span>

              {/* Source chip */}
              <div style={{ display: 'flex' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  ...(doc.isNoReceipt
                    ? { background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)', border: '1px solid var(--t-tier-pending-ring)' }
                    : { background: 'var(--t-chip-bg)',         color: 'var(--t-muted)',            border: '1px solid var(--t-line)' }
                  ),
                }}>
                  {doc.isNoReceipt ? 'Manual' : 'Upload'}
                </span>
              </div>

              {/* Transaction date */}
              <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                {fmtDate(doc.date)}
              </span>

              {/* Inflow */}
              {!isProcessing && doc.inflow > 0 ? (
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(doc.inflow)}
                </span>
              ) : (
                <span style={{ textAlign: 'right', color: 'var(--t-faint)' }}>—</span>
              )}

              {/* Outflow */}
              {!isProcessing && doc.outflow > 0 ? (
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-review-fg)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(doc.outflow)}
                </span>
              ) : (
                <span style={{ textAlign: 'right', color: 'var(--t-faint)' }}>—</span>
              )}

              {/* Status chip — wrapped to prevent grid stretching */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                  ...tierStyle(tier),
                }}>
                  {statusLabel}
                </span>
              </div>

              {/* Note — no-wrap + ellipsis to keep rows single-height */}
              <span style={{
                fontSize: 13, color: note ? noteColor : 'var(--t-faint)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {note || '—'}
              </span>
            </div>
          )
        })}

        {/* ── Footer row ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: COLS,
          columnGap:           16,
          padding:             '14px 24px',
          borderTop:           '2px solid var(--t-line)',
          background:          'var(--t-card-alt)',
        }}>
          <span style={{ gridColumn: '1 / 4', fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
            {pageDocs.length} {pageDocs.length === 1 ? 'entry' : 'entries'} on this page
          </span>
          <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>
            {totalInflow > 0 ? formatCurrency(totalInflow) : '—'}
          </span>
          <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-review-fg)', fontVariantNumeric: 'tabular-nums' }}>
            {totalOutflow > 0 ? formatCurrency(totalOutflow) : '—'}
          </span>
          <span />
          <span />
        </div>

        {/* ── Pagination bar ── */}
        {totalPages > 1 && (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '12px 24px',
            borderTop:      '1px solid var(--t-line)',
            background:     'var(--t-card)',
          }}>
            <span style={{ fontSize: 12.5, color: 'var(--t-faint)', fontWeight: 500 }}>
              Showing {pageStart + 1}–{Math.min(pageStart + perPage, totalDocs)} of {totalDocs}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-line)',
                  background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 14,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellipsis-${idx}`} style={{ fontSize: 13, color: 'var(--t-faint)', padding: '0 4px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onPageChange(p as number)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: p === page ? 700 : 500,
                        border: p === page ? '1.5px solid var(--t-primary)' : '1px solid var(--t-line)',
                        background: p === page ? 'var(--t-primary-soft)' : 'var(--t-card)',
                        color: p === page ? 'var(--t-primary)' : 'var(--t-ink)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-line)',
                  background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 14,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Mobile card list — visible on mobile only ── */}
      <div className="block md:hidden">
        {pageDocs.map((doc, i) => {
          const { label: statusLabel, tier } = STATUS[doc.status]
          const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`
          const amount = doc.inflow > 0
            ? formatCurrency(doc.inflow)
            : doc.outflow > 0
            ? formatCurrency(doc.outflow)
            : null
          const amountColor = doc.inflow > 0
            ? 'var(--t-tier-ready-fg)'
            : doc.outflow > 0
            ? 'var(--t-tier-review-fg)'
            : 'var(--t-faint)'

          return (
            <div
              key={doc.id}
              onClick={() => onRowClick(doc)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              style={{
                borderBottom: '1px solid var(--t-line-soft)',
                background: i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent',
              }}
            >
              <div className="flex flex-col gap-[3px] min-w-0 pr-3">
                <span className="font-bold text-[13.5px] text-t-ink truncate" style={{ maxWidth: 200 }}>
                  {ref}
                </span>
                <span className="text-[12px] text-t-muted">
                  {fmtDate(doc.date)}
                  {doc.isNoReceipt ? ' · Manual' : ' · Upload'}
                  {amount && (
                    <span style={{ color: amountColor }}>{` · ${amount}`}</span>
                  )}
                </span>
              </div>
              <span
                className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap"
                style={tierStyle(tier)}
              >
                {statusLabel}
              </span>
            </div>
          )
        })}

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--t-line)' }}>
            <span className="text-[12px]" style={{ color: 'var(--t-faint)' }}>
              {pageStart + 1}–{Math.min(pageStart + perPage, totalDocs)} of {totalDocs}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-semibold"
                style={{
                  borderColor: 'var(--t-line)', background: 'var(--t-card)', color: 'var(--t-ink)',
                  opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ‹
              </button>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--t-ink)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-semibold"
                style={{
                  borderColor: 'var(--t-line)', background: 'var(--t-card)', color: 'var(--t-ink)',
                  opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
