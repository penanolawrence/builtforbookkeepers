import PugMascot from '@/components/login/PugMascot'

interface MascotCompanionProps {
  theme: 'sofia' | 'yoda'
  brief?: string
}

const ACCENT: Record<'sofia' | 'yoda', { accent: string; accentGlow: string }> = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

export function MascotCompanion({ theme, brief }: MascotCompanionProps) {
  const { accent, accentGlow } = ACCENT[theme]
  const name = theme === 'sofia' ? 'Sofia' : 'Yoda'
  const line = brief ?? "2 entries need your eyes — I've sorted the rest into batches."

  return (
    <div
      style={{
        background:
          theme === 'sofia'
            ? 'linear-gradient(150deg, var(--t-primary-soft), var(--t-card))'
            : 'linear-gradient(150deg, var(--t-card-alt), var(--t-card))',
        border: '1px solid var(--t-line)',
        borderRadius: 20,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'var(--t-shadow)',
        overflow: 'hidden',
      }}
    >
      {/* Mascot */}
      <div style={{ flexShrink: 0 }}>
        <PugMascot
          variant={theme}
          accent={accent}
          accentGlow={accentGlow}
          peeking={false}
          happy={false}
          size={108}
        />
      </div>

      {/* Copy */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: 999,
              background: '#3C8E6C',
              boxShadow: '0 0 0 3px rgba(60,142,108,.18)',
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-primary)' }}>
            {name} · your AI co-pilot
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--t-ink)', lineHeight: 1.5, fontWeight: 500 }}>
          {line}
        </p>
      </div>
    </div>
  )
}
