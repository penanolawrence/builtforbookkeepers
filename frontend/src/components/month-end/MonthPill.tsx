import type { MonthEntry } from '@/types/period-closing'

interface MonthPillProps {
  month: MonthEntry
  isActive?: boolean
  onClick?: () => void
}

const STATUS_STYLES: Record<string, { container: string; dot: string }> = {
  closed: {
    container: 'bg-t-card border-t-line text-t-muted cursor-default',
    dot:       'text-[var(--t-tier-ready-fg)]',
  },
  ready: {
    container: 'bg-[var(--t-tier-ready-bg)] border-[var(--t-tier-ready-ring)] text-[var(--t-tier-ready-fg)] cursor-pointer hover:brightness-95',
    dot:       'text-[var(--t-tier-ready-fg)]',
  },
  blocked: {
    container: 'bg-[var(--t-tier-check-bg)] border-[var(--t-tier-check-ring)] text-[var(--t-tier-check-fg)] cursor-not-allowed',
    dot:       'text-[var(--t-tier-check-fg)]',
  },
  future: {
    container: 'bg-transparent border-t-line-soft text-t-faint cursor-default',
    dot:       'text-t-faint',
  },
  up_to_date: {
    container: 'bg-t-card border-t-line text-t-muted cursor-default',
    dot:       'text-t-muted',
  },
}

const STATUS_SUBLABELS: Record<string, (m: MonthEntry) => string> = {
  closed:     () => '✓ Closed',
  ready:      () => 'Ready ↗',
  blocked:    (m) => m.pendingDocs > 0 ? `⚠ ${m.pendingDocs} docs` : '⚠ AJEs',
  future:     () => 'Future',
  up_to_date: () => 'Up to date',
}

export function MonthPill({ month, isActive, onClick }: MonthPillProps) {
  const styles   = STATUS_STYLES[month.status] ?? STATUS_STYLES.future
  const subLabel = STATUS_SUBLABELS[month.status]?.(month) ?? ''
  const canClick = month.status === 'ready' && !!onClick

  const titleText = month.status === 'blocked'
    ? month.pendingDocs > 0
        ? `${month.pendingDocs} document(s) still pending review`
        : `${month.pendingAJEs} adjusting entr${month.pendingAJEs === 1 ? 'y' : 'ies'} not yet posted`
    : undefined

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      title={titleText}
      className={[
        'flex flex-col items-center gap-1 px-3 py-2 rounded-[10px]',
        'border-[1.5px] min-w-[72px] text-center transition-all select-none',
        styles.container,
        isActive ? 'ring-2 ring-t-primary border-t-primary' : '',
      ].join(' ')}
    >
      <span className="text-[11px] font-bold leading-tight">{month.label}</span>
      <span className={`text-[10px] font-medium mt-px ${styles.dot}`}>{subLabel}</span>
    </button>
  )
}
