'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExpenseBreakdown } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  clientId?: string
  start: string
  end: string
  refetchKey?: number
}

const COLS = 'minmax(160px, 2fr) 130px minmax(140px, 1fr)'

export function ExpenseBreakdownTable({ clientId, start, end, refetchKey = 0 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['expense-breakdown', clientId, start, end, refetchKey],
    queryFn: () => getExpenseBreakdown({ clientId, start, end }),
    enabled: !!start && !!end,
  })

  const [hoveredCode, setHoveredCode] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data)     return <EmptyState message="No data available." />

  const maxAmount = Math.max(...data.expenses.map((r) => r.total), 1)

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          Category
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-tier-review-fg)', textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          Amount
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)', textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          % of Total
        </span>
      </div>

      {/* Data rows */}
      {data.expenses.map((row, i) => {
        const pct      = data.grandTotal > 0 ? (row.total / data.grandTotal) * 100 : 0
        const barWidth = Math.round((row.total / maxAmount) * 140)
        const isHovered = hoveredCode === row.accountCode
        const rowBg    = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

        return (
          <div
            key={row.accountCode}
            onMouseEnter={() => setHoveredCode(row.accountCode)}
            onMouseLeave={() => setHoveredCode(null)}
            style={{
              display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
              padding: '13px 24px', alignItems: 'center',
              borderBottom: '1px solid var(--t-line-soft)',
              transition: 'background 0.14s',
              background: rowBg,
              boxShadow: 'inset 3px 0 0 transparent',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
              {row.accountName}
            </span>
            <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-review-fg)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(row.total)}
            </span>
            {/* Bar + percentage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <div style={{
                height: 6, borderRadius: 3, flexShrink: 0,
                width: `${barWidth}px`,
                background: 'var(--t-tier-review-fg)',
                opacity: 0.5,
              }} />
              <span style={{ fontSize: 12.5, color: 'var(--t-faint)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
        padding: '14px 24px', alignItems: 'center',
        borderTop: '2px solid var(--t-line)',
        background: 'var(--t-card-alt)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-review-fg)' }}>
          Total Expenses
        </span>
        <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-review-fg)', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(data.grandTotal)}
        </span>
        <span style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--t-faint)' }}>
          100%
        </span>
      </div>
    </div>
  )
}
