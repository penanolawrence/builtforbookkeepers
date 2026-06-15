'use client'

import { FileText, ClipboardList, Info, Lock } from 'lucide-react'

interface Props {
  onGenerate: () => void
  disabled?: boolean
}

export function NonVatEmptyState({ onGenerate, disabled }: Props) {
  return (
    <div className="border-2 border-dashed border-t-primary bg-t-primary-soft/40 rounded-xl p-10 flex flex-col items-center text-center gap-4">
      <div className="bg-t-primary-soft text-t-primary rounded-full p-3">
        <FileText className="h-10 w-10" />
      </div>

      <p className="text-base font-semibold text-t-ink">
        Your report hasn&apos;t been generated yet
      </p>

      <p className="text-sm text-t-muted">
        Select a period above, then click{' '}
        <span className="font-semibold text-t-ink">View</span> to load the report.
      </p>

      <div className="bg-t-primary-soft border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs text-t-primary">
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        No data will appear until you generate the report first.
      </div>

      <div className="flex items-stretch divide-x divide-gray-200 border border-t-line rounded-lg overflow-hidden bg-t-card w-full max-w-md text-xs text-t-muted">
        {[
          {
            n: 1,
            text: (
              <>
                Select client (if needed) and a{' '}
                <span className="font-semibold text-t-ink">period</span>
              </>
            ),
          },
          {
            n: 2,
            text: (
              <>
                Click <span className="font-semibold text-t-ink">View</span> to generate
              </>
            ),
          },
          {
            n: 3,
            text: (
              <>
                View or <span className="font-semibold text-t-ink">download</span> your 2551Q report
              </>
            ),
          },
        ].map(({ n, text }) => (
          <div key={n} className="flex-1 flex flex-col items-center gap-1 px-4 py-3">
            <span className="w-5 h-5 rounded-full bg-t-primary-soft text-t-primary text-[10px] font-bold flex items-center justify-center">
              {n}
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="relative inline-flex">
        {!disabled && (
          <span className="absolute inset-0 rounded-md bg-indigo-300 animate-ping" />
        )}
        <button
          onClick={onGenerate}
          disabled={disabled}
          className={[
            'relative px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-2',
            disabled
              ? 'bg-t-surface text-t-faint cursor-not-allowed'
              : 'bg-t-primary hover:bg-t-primary-deep text-white cursor-pointer',
          ].join(' ')}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Generate Report ↗
        </button>
      </div>

      <p className="text-xs text-t-faint flex items-center gap-1">
        <Lock className="h-3 w-3" />
        BIR-compliant Quarterly Percentage Tax (2551Q)
      </p>
    </div>
  )
}
