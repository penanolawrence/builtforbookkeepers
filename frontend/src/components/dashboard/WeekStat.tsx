interface WeekStatProps {
  value: string
  label: string
  sub?: string
  accent?: boolean  // if true, value renders in var(--t-primary)
}

export function WeekStat({ value, label, sub, accent }: WeekStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: accent ? 'var(--t-primary)' : 'var(--t-ink)',
          letterSpacing: '-.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-ink)' }}>{label}</span>
      {sub && <span style={{ fontSize: 11.5, color: 'var(--t-faint)' }}>{sub}</span>}
    </div>
  )
}
