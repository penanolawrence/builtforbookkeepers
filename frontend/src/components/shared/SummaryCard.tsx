import type { CSSProperties } from 'react'

interface SummaryCardProps {
  label: string
  value: string
  subnote?: string
  valueStyle?: CSSProperties
}

export function SummaryCard({ label, value, subnote, valueStyle }: SummaryCardProps) {
  return (
    <div
      className="flex-1 bg-t-card border border-t-line rounded-[16px] p-3 md:p-5"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <div className="text-[11px] font-bold text-t-faint uppercase tracking-[.06em] mb-2">
        {label}
      </div>
      <div
        className="text-[26px] font-bold leading-none tracking-[-0.025em]"
        style={{ fontFamily: 'var(--font-display)', ...valueStyle }}
      >
        {value}
      </div>
      {subnote && (
        <div className="text-[12px] text-t-faint mt-[5px]">{subnote}</div>
      )}
    </div>
  )
}
