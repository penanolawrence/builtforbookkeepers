'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type ReportType = 'income-statement' | 'expense-breakdown' | 'alpha-list'

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
  'alpha-list':        'Alpha List (1604-E)',
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [pending,  setPending]  = useState<ReportType | null>(null)
  const [clientId, setClientId] = useState('')
  const [start,    setStart]    = useState(defaultStart())
  const [end,      setEnd]      = useState(defaultEnd())

  const { data: clientsRes } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn:  () => getClients(),
  })
  const clients: { id: string; name: string }[] = (clientsRes as any)?.data ?? []

  function openModal(report: ReportType) {
    setClientId('')
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/admin/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
    setPending(null)
  }

  const cardCls  = 'bg-t-card border-[1.5px] border-t-line rounded-lg p-5 cursor-pointer hover:border-t-primary hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex flex-col'
  const inputCls = 'border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1 block'

  return (
    <div>
      <div className="mb-5">
        <div className="text-lg font-bold text-t-ink tracking-tight">Reports</div>
        <div className="text-xs text-t-faint mt-0.5">Select a report to view for a client</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="text-[28px] mb-3">📊</div>
          <div className="text-sm font-bold text-t-ink mb-1">Income Statement</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            Revenue vs expenses for the selected period. Shows gross income, total expenses, and net income.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="text-[28px] mb-3">🧾</div>
          <div className="text-sm font-bold text-t-ink mb-1">Expense Breakdown</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            Expenses by account category with totals. Useful for spotting over-spend by category.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">View Report →</div>
        </div>

        <Link href="/admin/reports/bir" className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-t-ink mb-1">BIR Books</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            Official BIR books of account: CRB, CDB, General Journal, General Ledger.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">View Book →</div>
        </Link>

        <Link href="/admin/reports/vat" className={cardCls}>
          <div className="text-[28px] mb-3">📑</div>
          <div className="text-sm font-bold text-t-ink mb-1">VAT Report</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            BIR-compliant VAT returns (2550M, 2550Q) and summary lists of sales and purchases.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">Open Report →</div>
        </Link>

        <Link href="/admin/reports/non-vat" className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-t-ink mb-1">Non-VAT Report</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            BIR Quarterly Percentage Tax (2551Q) — 3% on gross receipts. For non-VAT registered clients.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">Open Report →</div>
        </Link>

        <div onClick={() => openModal('alpha-list')} className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-t-ink mb-1">Alpha List (1604-E)</div>
          <div className="text-xs text-t-muted leading-relaxed flex-1">
            Summary of expanded withholding tax withheld per payee, for BIR 1604-E filing.
          </div>
          <div className="mt-3.5 text-xs font-bold text-t-primary">View Report →</div>
        </div>
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
