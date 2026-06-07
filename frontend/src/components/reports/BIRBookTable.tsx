'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBIRBook } from '@/lib/api/bir'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import { Skeleton } from '@/components/ui/skeleton'
import { BIRNoDataState } from '@/components/reports/BIRNoDataState'
import type { BIRBook, BIRRow, GLBook, GLRow } from '@/types/report'
import type { CSSProperties } from 'react'

interface Props {
  book: string
  clientId?: string
  start: string
  end: string
  accountId?: string
}

function isGLBook(data: BIRBook | GLBook): data is GLBook {
  return 'account' in data
}

type GJEntry =
  | { kind: 'row';      row: BIRRow; groupIdx: number }
  | { kind: 'subtotal'; ref: string | null; count: number; debit: number; credit: number; groupIdx: number }
  | { kind: 'total';    entryCount: number; refCount: number; debit: number; credit: number }

function buildGJEntries(rows: BIRRow[]): GJEntry[] {
  const entries: GJEntry[] = []
  const groups: { ref: string | null; rows: BIRRow[] }[] = []
  const refToIdx = new Map<string | null, number>()

  for (const row of rows) {
    const ref = row.ref != null ? String(row.ref) : null
    if (!refToIdx.has(ref)) {
      refToIdx.set(ref, groups.length)
      groups.push({ ref, rows: [] })
    }
    groups[refToIdx.get(ref)!].rows.push(row)
  }

  let totalDebit = 0, totalCredit = 0, totalEntries = 0
  for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
    const { ref, rows: groupRows } = groups[groupIdx]
    let gDebit = 0, gCredit = 0
    for (const row of groupRows) {
      entries.push({ kind: 'row', row, groupIdx })
      gDebit  += row.debit  != null ? Number(row.debit)  : 0
      gCredit += row.credit != null ? Number(row.credit) : 0
    }
    entries.push({ kind: 'subtotal', ref, count: groupRows.length, debit: gDebit, credit: gCredit, groupIdx })
    totalDebit   += gDebit
    totalCredit  += gCredit
    totalEntries += groupRows.length
  }
  entries.push({ kind: 'total', entryCount: totalEntries, refCount: groups.length, debit: totalDebit, credit: totalCredit })
  return entries
}

const HDR: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', overflow: 'hidden', whiteSpace: 'nowrap' }
const FAINT  = 'var(--t-faint)'
const READY  = 'var(--t-tier-ready-fg)'
const REVIEW = 'var(--t-tier-review-fg)'

function ColHeaders({ cols, headers }: { cols: string; headers: { label: string; align?: CSSProperties['textAlign']; color?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
      {headers.map(({ label, align = 'left', color = FAINT }, i) => (
        <span key={i} style={{ ...HDR, color, textAlign: align }}>{label}</span>
      ))}
    </div>
  )
}

export function BIRBookTable({ book, clientId, start, end, accountId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['bir-book', book, clientId, start, end, accountId],
    queryFn: () => getBIRBook(book, { clientId, start, end, accountId }),
    enabled: !!start && !!end,
  })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!start || !end) return null
  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data)     return <BIRNoDataState book={book} start={start} end={end} />

  // ── GL ───────────────────────────────────────────────────────────────────
  if (book === 'gl' || isGLBook(data)) {
    const gl   = data as GLBook
    const rows: GLRow[] = [
      { date: '', accountName: '', subtype: null, description: 'Opening Balance', ref: null, debit: null, credit: null, runningBalance: gl.openingBalance },
      ...gl.rows,
    ]
    const COLS = '90px minmax(100px, 1fr) minmax(120px, 1.5fr) 90px 130px 130px 130px'

    return (
      <div>
        {gl.parkedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 24px 16px', padding: '12px 16px', borderRadius: 10, background: 'var(--t-tier-check-bg)', border: '1px solid var(--t-tier-check-ring)', color: 'var(--t-tier-check-fg)', fontSize: 13 }}>
            <span style={{ flexShrink: 0 }}>⏳</span>
            <span>
              <strong>{gl.parkedCount} parked {gl.parkedCount === 1 ? 'document' : 'documents'}</strong>{' '}
              awaiting accountant review — not included in these totals.
            </span>
          </div>
        )}
        <ColHeaders cols={COLS} headers={[
          { label: 'Date' },
          { label: 'Account' },
          { label: 'Description' },
          { label: 'Ref' },
          { label: 'Debit',   align: 'right', color: READY  },
          { label: 'Credit',  align: 'right', color: REVIEW },
          { label: 'Balance', align: 'right' },
        ]} />
        {rows.map((row, i) => {
          const side      = row.runningBalance > 0 ? 'debit' : row.runningBalance < 0 ? 'credit' : null
          const isNormal  = side === null || side === gl.account.normalBalance
          const balColor  = side === null ? FAINT : isNormal ? READY : REVIEW
          const badge     = side === 'debit' ? ' DR' : side === 'credit' ? ' CR' : ''
          const isHovered = hoveredIdx === i
          const rowBg     = isHovered ? 'var(--t-primary-soft)' : i === 0 ? 'var(--t-card-alt)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

          return (
            <div key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '10px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
            >
              <span style={{ fontSize: 13, color: FAINT }}>{row.date ? formatDate(row.date) : ''}</span>
              <span style={{ fontSize: 13, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.accountName}</span>
              <span style={{ fontSize: 13, color: i === 0 ? 'var(--t-ink)' : 'var(--t-muted)', fontWeight: i === 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span>
              <span style={{ fontSize: 13, color: FAINT }}>{row.ref ?? ''}</span>
              <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: row.debit != null ? (gl.account.normalBalance === 'debit' ? READY : REVIEW) : FAINT }}>
                {row.debit != null ? formatCurrency(row.debit) : '—'}
              </span>
              <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: row.credit != null ? (gl.account.normalBalance === 'credit' ? READY : REVIEW) : FAINT }}>
                {row.credit != null ? formatCurrency(row.credit) : '—'}
              </span>
              <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: balColor }}>
                {formatCurrency(Math.abs(row.runningBalance))}{badge}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const birData = data as BIRBook
  const showVat = birData.isVat

  // ── GJ ───────────────────────────────────────────────────────────────────
  if (book === 'gj') {
    if (birData.rows.length === 0) return <BIRNoDataState book={book} start={start} end={end} />
    const gjEntries = buildGJEntries(birData.rows)
    const COLS = '90px minmax(120px, 1.5fr) minmax(120px, 1.5fr) 90px 130px 130px'

    return (
      <div>
        <ColHeaders cols={COLS} headers={[
          { label: 'Date' },
          { label: 'Account' },
          { label: 'Description' },
          { label: 'Ref' },
          { label: 'Debit',  align: 'right', color: READY  },
          { label: 'Credit', align: 'right', color: REVIEW },
        ]} />
        {gjEntries.map((entry, i) => {
          if (entry.kind === 'row') {
            const { row } = entry
            const isHovered = hoveredIdx === i
            const rowBg     = isHovered ? 'var(--t-primary-soft)' : entry.groupIdx % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
            return (
              <div key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '10px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
              >
                <span style={{ fontSize: 13, color: FAINT }}>{row.date ? formatDate(String(row.date)) : ''}</span>
                <span style={{ fontSize: 13, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.accountName != null ? String(row.accountName) : ''}</span>
                <span style={{ fontSize: 13, color: 'var(--t-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description != null ? String(row.description) : ''}</span>
                <span style={{ fontSize: 13, color: FAINT }}>{row.ref ?? ''}</span>
                <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: row.debit != null ? READY : FAINT }}>
                  {row.debit != null ? formatCurrency(Number(row.debit)) : '—'}
                </span>
                <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: row.credit != null ? REVIEW : FAINT }}>
                  {row.credit != null ? formatCurrency(Number(row.credit)) : '—'}
                </span>
              </div>
            )
          }

          if (entry.kind === 'subtotal') {
            const subtotalBg = entry.groupIdx % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '8px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', background: subtotalBg }}>
                <span />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-muted)' }}>
                  Subtotal · {entry.count} {entry.count === 1 ? 'entry' : 'entries'}
                </span>
                <span />
                <span style={{ fontSize: 13, color: FAINT }}>{entry.ref ?? ''}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: READY, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.debit)}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: REVIEW, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.credit)}</span>
              </div>
            )
          }

          // kind === 'total'
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '14px 24px', alignItems: 'center', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
              <span />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t-muted)' }}>
                {entry.entryCount} {entry.entryCount === 1 ? 'entry' : 'entries'} · {entry.refCount} {entry.refCount === 1 ? 'ref' : 'refs'}
              </span>
              <span /><span />
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: READY, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.debit)}</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: REVIEW, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.credit)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── CRB / CDB ────────────────────────────────────────────────────────────
  const isCrb = book === 'crb'
  if (birData.rows.length === 0) return <BIRNoDataState book={book} start={start} end={end} />

  const COLS = showVat
    ? '90px 100px minmax(120px, 2fr) 120px 100px 110px minmax(80px, 1fr)'
    : '90px 100px minmax(120px, 2fr) 120px minmax(80px, 1fr)'

  const amtColor = isCrb ? READY : REVIEW

  const headers = [
    { label: 'Date' },
    { label: 'Ref No.' },
    { label: isCrb ? 'Payor' : 'Payee' },
    { label: isCrb ? 'Inflow' : 'Outflow', align: 'right' as const, color: amtColor },
    ...(showVat ? [
      { label: 'VAT',        align: 'right' as const, color: amtColor },
      { label: 'Net of VAT', align: 'right' as const, color: amtColor },
    ] : []),
    { label: 'Category' },
  ]

  const total = birData.rows.reduce((s, r) => s + (r.amount != null ? Number(r.amount) : 0), 0)

  return (
    <div>
      <ColHeaders cols={COLS} headers={headers} />
      {birData.rows.map((row, i) => {
        const isHovered = hoveredIdx === i
        const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
        return (
          <div key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '10px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
          >
            <span style={{ fontSize: 13, color: FAINT }}>{row.date ? formatDate(String(row.date)) : ''}</span>
            <span style={{ fontSize: 13, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row.ref_no ?? row.refNo ?? '')}</span>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {String(isCrb ? (row.payor ?? '') : (row.payee ?? ''))}
            </span>
            <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: row.amount != null ? amtColor : FAINT, fontVariantNumeric: 'tabular-nums' }}>
              {row.amount != null ? formatCurrency(Number(row.amount)) : '—'}
            </span>
            {showVat && (
              <span style={{ textAlign: 'right', fontSize: 13.5, color: row.vat != null ? amtColor : FAINT, fontVariantNumeric: 'tabular-nums' }}>
                {row.vat != null ? formatCurrency(Number(row.vat)) : '—'}
              </span>
            )}
            {showVat && (
              <span style={{ textAlign: 'right', fontSize: 13.5, color: row.net_of_vat != null ? amtColor : FAINT, fontVariantNumeric: 'tabular-nums' }}>
                {row.net_of_vat != null ? formatCurrency(Number(row.net_of_vat)) : '—'}
              </span>
            )}
            <span style={{ fontSize: 13, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row.category ?? '')}</span>
          </div>
        )
      })}
      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
        <span style={{ gridColumn: '1 / 4', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--t-muted)' }}>
          {birData.rows.length} {birData.rows.length === 1 ? 'entry' : 'entries'}
        </span>
        <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: amtColor, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(total)}
        </span>
        {showVat && <span />}
        {showVat && <span />}
        <span />
      </div>
    </div>
  )
}
