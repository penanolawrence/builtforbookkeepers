'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExpenseBreakdownTable } from '@/components/reports/ExpenseBreakdownTable'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  params: { clientId: string }
}

function ExpenseBreakdownContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')
  const [refetchKey, setRefetchKey] = useState(0)

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link href="/admin/reports">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Reports
        </Link>
      </Button>

      <div className="mb-4">
        <h1 className="text-lg font-bold text-t-ink tracking-tight">Expense Breakdown</h1>
      </div>
      <ReportToolbar
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e) }}
        onGenerate={() => setRefetchKey((k) => k + 1)}
        exportButton={
          <ExportPDFButton type="expense-breakdown" clientId={clientId} start={start} end={end} />
        }
      />
      <div className="bg-t-card border border-t-line rounded-lg overflow-hidden">
        <ExpenseBreakdownTable clientId={clientId} start={start} end={end} refetchKey={refetchKey} />
      </div>
    </div>
  )
}

export default function AdminExpenseBreakdownPage({ params }: Props) {
  const { clientId } = params
  return (
    <Suspense>
      <ExpenseBreakdownContent clientId={clientId} />
    </Suspense>
  )
}
