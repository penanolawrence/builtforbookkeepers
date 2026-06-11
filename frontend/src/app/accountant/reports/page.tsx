'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
type ReportType = 'income-statement' | 'expense-breakdown'

function defaultStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10)
}

const REPORT_LABELS: Record<ReportType, string> = {
  'income-statement':  'Income Statement',
  'expense-breakdown': 'Expense Breakdown',
}

export default function AccountantReportsPage() {
  const router = useRouter()
  const [pending,  setPending]  = useState<ReportType | null>(null)
  const [clientId, setClientId] = useState('')
  const [start,    setStart]    = useState(defaultStart())
  const [end,      setEnd]      = useState(defaultEnd())

  const { data: clientsPage } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn:  () => getAccountantClients(),
  })
  const clients = clientsPage?.data ?? []

  function openModal(report: ReportType) {
    setClientId('')
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/accountant/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
    setPending(null)
  }

  const cardCls  = 'bg-t-card border-[1.5px] border-t-line rounded-lg p-4 md:p-5 cursor-pointer hover:border-t-primary hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex items-center gap-3 md:flex-col md:items-start md:gap-0'
  const inputCls = 'border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1 block'

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-5 md:p-6">
      <div className="mb-5">
        <h1
          className="text-[28px] md:text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reports
        </h1>
        <p className="text-[14px] text-t-muted mt-1">Select a report to view for a client</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📊</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">Income Statement</div>
            <div className="text-xs text-t-muted leading-relaxed">
              Revenue vs expenses for the selected period. Shows gross income, total expenses, and net income.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">🧾</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">Expense Breakdown</div>
            <div className="text-xs text-t-muted leading-relaxed">
              Expenses by account category with totals. Useful for spotting over-spend by category.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">View Report →</div>
        </div>

        <Link href="/accountant/reports/bir" className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📋</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">BIR Books</div>
            <div className="text-xs text-t-muted leading-relaxed">
              Official BIR books of account: CRB, CDB, General Journal, General Ledger.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">View Book →</div>
        </Link>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-sm font-bold text-t-ink">
            {pending ? REPORT_LABELS[pending] : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
            <div>
              <label className={labelCls}>Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>From</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>To</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={!clientId}
              className="bg-t-primary text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-t-primary-deep transition-colors disabled:opacity-50"
            >
              View Report →
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
