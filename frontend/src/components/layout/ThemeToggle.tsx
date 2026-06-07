'use client'

import { useTheme } from '@/components/layout/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="tablist"
      aria-label="Theme"
      style={{
        position: 'relative',
        display: 'flex',
        padding: 4,
        borderRadius: 999,
        background: theme === 'sofia' ? '#EFE7DA' : '#211D2E',
        border: '1px solid var(--t-line)',
      }}
    >
      {/* Sliding thumb */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          width: 'calc(50% - 4px)',
          borderRadius: 999,
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          left: 4,
          transform: theme === 'sofia' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .32s cubic-bezier(.34,1.3,.5,1)',
        }}
      />
      {(['sofia', 'yoda'] as const).map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={theme === k ? 'true' : 'false'}
          onClick={() => { if (theme !== k) setTheme(k) }}
          style={{
            position: 'relative',
            zIndex: 2,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 12.5,
            padding: '6px 16px',
            borderRadius: 999,
            color: theme === k ? '#fff' : 'var(--t-muted)',
            transition: 'color .25s',
          }}
        >
          {k === 'sofia' ? 'Sofia' : 'Yoda'}
        </button>
      ))}
    </div>
  )
}
