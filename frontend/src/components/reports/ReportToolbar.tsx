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
  const inputCls = 'flex-1 min-w-0 h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface'

  return (
    <div
      className="mb-[22px] bg-t-card border border-t-line rounded-[14px] px-[18px] py-4 md:py-3.5"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2.5">
        {/* date range */}
        <div className="flex items-center gap-2 flex-1">
          <span className="shrink-0 text-[13px] font-semibold text-t-muted">Period</span>
          <input
            type="date"
            value={start}
            onChange={(e) => onChange(e.target.value, end)}
            className={inputCls}
          />
          <span className="shrink-0 text-t-faint text-sm">–</span>
          <input
            type="date"
            value={end}
            onChange={(e) => onChange(start, e.target.value)}
            className={inputCls}
          />
        </div>
        {/* buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            className="flex-1 md:flex-none h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white flex items-center justify-center"
            style={{
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow: '0 12px 22px -12px var(--t-primary)',
            }}
          >
            Generate
          </button>
          {exportButton}
        </div>
      </div>
    </div>
  )
}
