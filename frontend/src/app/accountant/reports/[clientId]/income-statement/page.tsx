'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { IncomeStatementTable } from '@/components/reports/IncomeStatementTable'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

interface Props {
  params: { clientId: string }
}

function IncomeStatementContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')
  const [refetchKey, setRefetchKey] = useState(0)

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Reports', href: '/accountant/reports' }, { label: 'Income Statement' }]} />
      <div className="mb-[22px]">
        <h1
          className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Income Statement
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">Approved transactions only</p>
      </div>
      <ReportToolbar
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e) }}
        onGenerate={() => setRefetchKey((k) => k + 1)}
        exportButton={
          <ExportPDFButton type="income-statement" clientId={clientId} start={start} end={end} />
        }
      />
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        <IncomeStatementTable clientId={clientId} start={start} end={end} refetchKey={refetchKey} />
      </div>
    </div>
  )
}

export default function AccountantIncomeStatementPage({ params }: Props) {
  const { clientId } = params
  return (
    <Suspense>
      <IncomeStatementContent clientId={clientId} />
    </Suspense>
  )
}
