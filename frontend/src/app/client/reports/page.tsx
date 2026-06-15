'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getAccounts } from '@/lib/api/accounts'
import { useAuth } from '@/lib/hooks/useAuth'

type ReportType = 'income-statement' | 'expense-breakdown' | 'bir'

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
  'bir':               'BIR Books',
}

export default function ClientReportsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [pending,   setPending]   = useState<ReportType | null>(null)
  const [start,     setStart]     = useState(defaultStart())
  const [end,       setEnd]       = useState(defaultEnd())
  const [birBook,   setBirBook]   = useState('crb')
  const [accountId, setAccountId] = useState<string | undefined>()

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn:  () => getAccounts(),
    enabled:  pending === 'bir' && birBook === 'gl',
  })

  function openModal(report: ReportType) {
    setAccountId(undefined)
    setPending(report)
  }

  function handleView() {
    if (!pending) return
    const qs = `?start=${start}&end=${end}`
    if (pending === 'bir') {
      const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
      router.push(`/client/reports/bir${qs}&book=${birBook}${acct}`)
    } else {
      router.push(`/client/reports/${pending}${qs}`)
    }
    setPending(null)
  }

  const cardCls  = 'bg-t-card border-[1.5px] border-t-line rounded-lg p-4 md:p-5 cursor-pointer hover:border-t-primary hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex items-center gap-3 md:flex-col md:items-start md:gap-0'
  const inputCls = 'border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1 block'

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <div className="mb-5">
        <h1
          className="text-[28px] md:text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reports
        </h1>
        <p className="text-[14px] text-t-muted mt-1">Read-only · your accountant handles BIR filing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📊</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">Income Statement</div>
            <div className="text-xs text-t-muted leading-relaxed">
              Compare your total income against expenses for any period. Shows net profit or loss.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">🧾</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">Expense Breakdown</div>
            <div className="text-xs text-t-muted leading-relaxed">
              See where your money went, grouped by expense category with percentage totals.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">View Report →</div>
        </div>

        <div onClick={() => openModal('bir')} className={cardCls}>
          <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📚</div>
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="text-sm font-bold text-t-ink mb-1">BIR Books</div>
            <div className="text-xs text-t-muted leading-relaxed">
              Cash books and journals formatted for BIR loose-leaf submission. For reference only.
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">Open Books →</div>
        </div>

        {user?.birType === 'vat' && (
          <Link href="/client/reports/vat" className={cardCls}>
            <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📑</div>
            <div className="flex-1 min-w-0 md:flex-none md:w-full">
              <div className="text-sm font-bold text-t-ink mb-1">VAT Report</div>
              <div className="text-xs text-t-muted leading-relaxed">
                BIR-compliant VAT returns (2550M, 2550Q) and summary lists of sales and purchases.
              </div>
            </div>
            <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">Download PDF →</div>
          </Link>
        )}

        {user?.birType === 'non_vat' && (
          <Link href="/client/reports/non-vat" className={cardCls}>
            <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📋</div>
            <div className="flex-1 min-w-0 md:flex-none md:w-full">
              <div className="text-sm font-bold text-t-ink mb-1">Non-VAT Report</div>
              <div className="text-xs text-t-muted leading-relaxed">
                BIR Quarterly Percentage Tax (2551Q) — 3% on gross receipts each quarter.
              </div>
            </div>
            <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">Download PDF →</div>
          </Link>
        )}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-sm font-bold text-t-ink">
            {pending ? REPORT_LABELS[pending] : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
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

            {pending === 'bir' && (
              <div>
                <label className={labelCls}>Book</label>
                <select
                  value={birBook}
                  onChange={(e) => { setBirBook(e.target.value); setAccountId(undefined) }}
                  className={inputCls}
                >
                  <option value="crb">Cash Receipts Book (CRB)</option>
                  <option value="cdb">Cash Disbursements Book (CDB)</option>
                  <option value="gj">General Journal (GJ)</option>
                  <option value="gl">General Ledger (GL)</option>
                </select>
              </div>
            )}

            {pending === 'bir' && birBook === 'gl' && (
              <div>
                <label className={labelCls}>Account</label>
                <select
                  value={accountId ?? ''}
                  onChange={(e) => setAccountId(e.target.value || undefined)}
                  className={inputCls}
                >
                  <option value="">Select account…</option>
                  {(accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={pending === 'bir' && birBook === 'gl' && !accountId}
              className="bg-t-primary text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-t-primary-deep transition-colors disabled:opacity-50"
            >
              {pending === 'bir' ? 'View Book →' : 'View Report →'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
