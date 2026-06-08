import { TierChip, TierKey } from './TierCard'

export interface ClientRow {
  id: string
  name: string
  type: 'VAT' | 'Non-VAT'
  plan: string
  review: number
  check: number
  ready: number
  pending: number
  lastActive?: string
}

const TIER_COLS: { key: TierKey; short: string }[] = [
  { key: 'review',  short: 'Review'  },
  { key: 'check',   short: 'Check'   },
  { key: 'ready',   short: 'Ready'   },
  { key: 'pending', short: 'Pending' },
]

const GRID = '1.7fr .8fr .8fr 64px 64px 64px 64px .9fr'

interface ClientsTableProps {
  rows: ClientRow[]
}

export function ClientsTable({ rows }: ClientsTableProps) {
  return (
    <div style={{ width: '100%' }}>

      {/* ── Desktop table — hidden on mobile ── */}
      <div className="hidden md:block">
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            padding: '0 18px 12px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--t-faint)' }}>Business</span>
          <span style={{ color: 'var(--t-faint)' }}>Type</span>
          <span style={{ color: 'var(--t-faint)' }}>Plan</span>
          {TIER_COLS.map(({ key, short }) => (
            <span
              key={key}
              style={{ textAlign: 'center', color: `var(--t-tier-${key}-fg)` }}
            >
              {short}
            </span>
          ))}
          <span style={{ textAlign: 'right', color: 'var(--t-faint)' }}>Active</span>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={row.id}
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              padding: '14px 18px',
              alignItems: 'center',
              borderTop: '1px solid var(--t-line-soft)',
              background: i % 2 === 0 ? 'var(--t-card-alt)' : 'transparent',
              borderRadius: 12,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--t-ink)' }}>{row.name}</span>
            <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>{row.type}</span>
            <span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--t-muted)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'var(--t-chip-bg)',
                  border: '1px solid var(--t-line)',
                }}
              >
                {row.plan}
              </span>
            </span>
            {TIER_COLS.map(({ key }) => (
              <span key={key} style={{ textAlign: 'center' }}>
                <TierChip tierKey={key} count={row[key as keyof ClientRow] as number} />
              </span>
            ))}
            <span style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--t-faint)' }}>
              {row.lastActive ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Mobile cards — visible on mobile only ── */}
      <div className="block md:hidden">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderTop: '1px solid var(--t-line-soft)',
              background: i % 2 === 0 ? 'var(--t-card-alt)' : 'transparent',
            }}
          >
            <div className="flex flex-col gap-[3px] min-w-0 pr-3">
              <span className="font-bold text-[14px] text-t-ink truncate">{row.name}</span>
              <span className="text-[12px] text-t-muted">{row.type} · {row.plan}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {TIER_COLS.map(({ key }) => (
                <TierChip key={key} tierKey={key} count={row[key as keyof ClientRow] as number} />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
