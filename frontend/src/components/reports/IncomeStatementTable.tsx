'use client'

import { useState, useEffect, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { getIncomeStatement } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  clientId?: string
  start: string
  end: string
  refetchKey?: number
}

const ROW_COLS = '1fr 160px'

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '8px 24px',
      background: 'var(--t-card-alt)',
      borderBottom: '1px solid var(--t-line-soft)',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.06em', color: 'var(--t-muted)',
    }}>
      {label}
    </div>
  )
}

function SubtotalRow({ label, amount, tier }: { label: string; amount: number; tier: 'ready' | 'review' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: ROW_COLS,
      background: `var(--t-tier-${tier}-bg)`,
      borderTop: '1px solid var(--t-line)',
      borderBottom: '1px solid var(--t-line)',
    }}>
      <div style={{ padding: '12px 8px 12px 24px', fontWeight: 700, fontSize: 13.5, color: `var(--t-tier-${tier}-fg)` }}>
        {label}
      </div>
      <div style={{
        padding: '12px 24px 12px 0', textAlign: 'right',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
        color: `var(--t-tier-${tier}-fg)`, fontVariantNumeric: 'tabular-nums',
      }}>
        {formatCurrency(amount)}
      </div>
    </div>
  )
}

export function IncomeStatementTable({ clientId, start, end, refetchKey = 0 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', clientId, start, end, refetchKey],
    queryFn: () => getIncomeStatement({ clientId, start, end }),
    enabled: !!start && !!end,
  })

  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})
  const [hoveredCode, setHovered] = useState<string | null>(null)

  useEffect(() => { setExpanded({}) }, [start, end])

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data)     return <EmptyState message="No data available." />

  const isProfit = data.totals.netIncome >= 0
  const toggle   = (code: string) => setExpanded(prev => ({ ...prev, [code]: !prev[code] }))

  const renderRows = (rows: typeof data.income, offset: number) =>
    rows.map((row, i) => {
      const isOpen      = expanded[row.accountCode] ?? false
      const isExpandable = row.subtypes.length > 0
      const isHovered   = hoveredCode === row.accountCode
      const rowBg       = isHovered && isExpandable
        ? 'var(--t-primary-soft)'
        : (offset + i) % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

      return (
        <Fragment key={row.accountCode}>
          {/* Main row */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: ROW_COLS,
              background: rowBg,
              borderBottom: '1px solid var(--t-line-soft)',
              cursor: isExpandable ? 'pointer' : 'default',
              transition: 'background 0.14s',
            }}
            onClick={() => isExpandable && toggle(row.accountCode)}
            onMouseEnter={() => isExpandable && setHovered(row.accountCode)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ padding: '10px 8px 10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--t-ink)', fontWeight: isExpandable ? 600 : 400 }}>
              {isExpandable && (
                <ChevronRight
                  size={14}
                  style={{
                    flexShrink: 0, color: 'var(--t-faint)',
                    transition: 'transform 150ms',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              )}
              {row.accountName}
            </div>
            <div style={{ padding: '10px 24px 10px 0', textAlign: 'right', fontSize: 13.5, color: 'var(--t-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(row.total)}
            </div>
          </div>

          {/* Sub-rows */}
          {isOpen && row.subtypes.map((sub) => (
            <div key={`${row.accountCode}-${sub.name}`} style={{ display: 'grid', gridTemplateColumns: ROW_COLS, borderBottom: '1px solid var(--t-line-soft)', background: 'var(--t-card-alt)' }}>
              <div style={{ padding: '8px 8px 8px 52px', fontSize: 13, color: 'var(--t-muted)', fontStyle: 'italic' }}>
                — {sub.name}
              </div>
              <div style={{ padding: '8px 24px 8px 0', textAlign: 'right', fontSize: 13, color: 'var(--t-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(sub.total)}
              </div>
            </div>
          ))}
        </Fragment>
      )
    })

  return (
    <div>
      <SectionHeader label="Income" />
      {renderRows(data.income, 0)}
      <SubtotalRow label="Total Income" amount={data.totals.totalIncome} tier="ready" />

      <SectionHeader label="Expenses" />
      {renderRows(data.expenses, data.income.length)}
      <SubtotalRow label="Total Expenses" amount={data.totals.totalExpenses} tier="review" />

      {/* Net Income / Net Loss footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: ROW_COLS,
        background: isProfit ? 'var(--t-tier-ready-bg)' : 'var(--t-tier-review-bg)',
        borderTop: '2px solid var(--t-line)',
      }}>
        <div style={{
          padding: '14px 8px 14px 24px',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
          color: isProfit ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)',
        }}>
          {isProfit ? 'Net Income' : 'Net Loss'}
        </div>
        <div style={{
          padding: '14px 24px 14px 0', textAlign: 'right',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
          color: isProfit ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatCurrency(Math.abs(data.totals.netIncome))}
        </div>
      </div>
    </div>
  )
}
