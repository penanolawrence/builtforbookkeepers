// frontend/src/app/client/reports/income-statement/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { IncomeStatementTable } from '@/components/reports/IncomeStatementTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { PendingTransactionNote } from '@/components/reports/PendingTransactionNote'

function IncomeStatementContent() {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')
  const [refetchKey, setRefetchKey] = useState(0)

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'Reports', href: '/client/reports' }, { label: 'Income Statement' }]} />
      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Income Statement
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">Approved transactions only</p>
        </div>
      </div>
      <ReportToolbar
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e) }}
        onGenerate={() => setRefetchKey((k) => k + 1)}
        exportButton={
          <ExportPDFButton type="income-statement" start={start} end={end} />
        }
      />
      {/* PendingTransactionNote self-hides when count === 0.
          Wire count to API pendingCount when the backend supports it. */}
      <PendingTransactionNote count={0} />
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        <IncomeStatementTable start={start} end={end} refetchKey={refetchKey} />
      </div>
    </div>
  )
}

export default function IncomeStatementPage() {
  return (
    <Suspense>
      <IncomeStatementContent />
    </Suspense>
  )
}
