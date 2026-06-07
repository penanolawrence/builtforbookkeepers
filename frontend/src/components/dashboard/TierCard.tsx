export type TierKey = 'review' | 'check' | 'ready' | 'pending'

export interface Tier {
  key: TierKey
  label: string
  count: number
  note: string
}

export function TierCard({ tier }: { tier: Tier }) {
  const k = tier.key
  return (
    <div
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 18,
        padding: '20px 22px',
        boxShadow: 'var(--t-shadow)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span
          style={{
            width: 9, height: 9, borderRadius: 999,
            background: `var(--t-tier-${k}-fg)`,
            boxShadow: `0 0 0 4px var(--t-tier-${k}-bg)`,
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-muted)', letterSpacing: '.01em' }}>
          {tier.label}
        </span>
      </div>

      {/* Count + status pill */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 42,
            lineHeight: 0.9,
            color: `var(--t-tier-${k}-fg)`,
            letterSpacing: '-.03em',
          }}
        >
          {tier.count}
        </span>
        <span
          style={{
            marginBottom: 4,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            color: `var(--t-tier-${k}-fg)`,
            background: `var(--t-tier-${k}-bg)`,
            border: `1px solid var(--t-tier-${k}-ring)`,
          }}
        >
          {tier.count === 0 ? 'all clear' : 'open'}
        </span>
      </div>

      {/* Note */}
      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--t-faint)', lineHeight: 1.4 }}>
        {tier.note}
      </p>
    </div>
  )
}

export function TierChip({ tierKey, count }: { tierKey: TierKey; count: number }) {
  if (count === 0) {
    return <span style={{ color: 'var(--t-faint)', fontSize: 14 }}>—</span>
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 24,
        padding: '0 7px',
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 700,
        color: `var(--t-tier-${tierKey}-fg)`,
        background: `var(--t-tier-${tierKey}-bg)`,
        border: `1px solid var(--t-tier-${tierKey}-ring)`,
      }}
    >
      {count}
    </span>
  )
}
