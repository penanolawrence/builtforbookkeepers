'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAlphaList, downloadAlphaListCsv, downloadAlphaListPdf } from '@/lib/api/reports'
import { AlphaListTable } from '@/components/reports/AlphaListTable'
import { ReportBreadcrumb } from '@/components/reports/ReportBreadcrumb'

function AlphaListContent() {
  const params = useSearchParams()
  const start  = params.get('start') ?? ''
  const end    = params.get('end') ?? ''

  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['alpha-list', start, end],
    queryFn:  () => getAlphaList({ start, end }),
    enabled:  !!start && !!end,
  })

  async function handleCsv() {
    setCsvLoading(true)
    try { await downloadAlphaListCsv({ start, end }) } finally { setCsvLoading(false) }
  }

  async function handlePdf() {
    setPdfLoading(true)
    try { await downloadAlphaListPdf({ start, end }) } finally { setPdfLoading(false) }
  }

  const hasRows  = !!data?.rows.length
  const btnCls   = 'text-xs font-semibold px-3 py-1.5 rounded-md border border-t-line text-t-ink hover:bg-t-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <ReportBreadcrumb title="Alpha List (1604-E)" />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1
            className="text-[22px] font-bold tracking-[-0.025em] text-t-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Alpha List — 1604-E
          </h1>
          <p className="text-[13px] text-t-muted mt-0.5">{start} to {end}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCsv} disabled={csvLoading || isLoading || !hasRows} className={btnCls}>
            {csvLoading ? 'Downloading…' : 'Export CSV'}
          </button>
          <button onClick={handlePdf} disabled={pdfLoading || isLoading || !hasRows} className={btnCls}>
            {pdfLoading ? 'Downloading…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-t-muted">Loading…</p>
      )}
      {!isLoading && !hasRows && (
        <div className="border-2 border-dashed border-t-line rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <p className="text-base font-semibold text-t-ink">No alpha list entries found</p>
          <p className="text-sm text-t-muted">
            No expanded withholding tax transactions were found for the selected period.
          </p>
        </div>
      )}
      {!isLoading && hasRows && <AlphaListTable rows={data!.rows} />}
    </div>
  )
}

export default function AlphaListPage() {
  return (
    <Suspense>
      <AlphaListContent />
    </Suspense>
  )
}
