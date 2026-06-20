'use client'

import type { AlphaListRow } from '@/types/report'

interface Props {
  rows: AlphaListRow[]
}

export function AlphaListTable({ rows }: Props) {
  const totalGross = rows.reduce((sum, r) => sum + r.grossPayment, 0)
  const totalEwt   = rows.reduce((sum, r) => sum + r.ewtAmount, 0)

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const thCls = 'py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-t-muted'
  const tdCls = 'py-2 px-3 text-xs text-t-ink border-b border-t-line'

  return (
    <div className="overflow-x-auto rounded-lg border border-t-line">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-t-surface border-b border-t-line">
            <th className={thCls}>#</th>
            <th className={thCls}>TIN</th>
            <th className={thCls}>Payee Name</th>
            <th className={thCls}>Address</th>
            <th className={thCls}>ATC</th>
            <th className={thCls}>Nature of Income</th>
            <th className={`${thCls} text-right`}>Gross Payment</th>
            <th className={`${thCls} text-right`}>Rate</th>
            <th className={`${thCls} text-right`}>EWT Withheld</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-t-surface/50 transition-colors">
              <td className={`${tdCls} text-t-muted`}>{i + 1}</td>
              <td className={`${tdCls} font-mono`}>{row.tin || '—'}</td>
              <td className={tdCls}>{row.payeeName}</td>
              <td className={`${tdCls} text-t-muted`}>{row.address || '—'}</td>
              <td className={`${tdCls} font-mono`}>{row.atcCode}</td>
              <td className={`${tdCls} text-t-muted`}>{row.natureOfIncome}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{fmt(row.grossPayment)}</td>
              <td className={`${tdCls} text-right text-t-muted`}>{row.rate}%</td>
              <td className={`${tdCls} text-right tabular-nums`}>{fmt(row.ewtAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-t-line bg-t-surface font-bold text-xs">
            <td colSpan={6} className="py-2 px-3 text-t-ink">Total</td>
            <td className="py-2 px-3 text-right tabular-nums text-t-ink">{fmt(totalGross)}</td>
            <td />
            <td className="py-2 px-3 text-right tabular-nums text-t-ink">{fmt(totalEwt)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
