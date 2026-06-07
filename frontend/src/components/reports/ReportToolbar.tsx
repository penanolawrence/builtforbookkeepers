// frontend/src/components/reports/ReportToolbar.tsx
import type { ReactNode } from 'react'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  onGenerate: () => void
  exportButton: ReactNode
}

export function ReportToolbar({ start, end, onChange, onGenerate, exportButton }: Props) {
  return (
    <div
      className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <span className="text-[13px] font-semibold text-t-muted whitespace-nowrap">Period</span>
      <input
        type="date"
        value={start}
        onChange={(e) => onChange(e.target.value, end)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
      />
      <span className="text-t-faint text-sm">–</span>
      <input
        type="date"
        value={end}
        onChange={(e) => onChange(start, e.target.value)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
      />
      <button
        onClick={onGenerate}
        className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white flex items-center gap-1.5"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        Generate
      </button>
      <div className="flex-1" />
      {exportButton}
    </div>
  )
}
