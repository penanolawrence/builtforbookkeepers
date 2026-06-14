'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchVat2550q } from '@/lib/api/reports'
import type { Vat2550qMonthRow } from '@/types/report'

interface Props {
  clientId?: string
  quarter: number
  year: number
}

const COL_LABELS = [
  'Taxable Sales', 'Output VAT', 'Taxable Purchases', 'Input VAT', 'Net VAT Payable',
]

const COL_KEYS: (keyof Omit<Vat2550qMonthRow, 'month' | 'label'>)[] = [
  'taxable_sales', 'output_vat', 'taxable_purchases', 'input_vat', 'net_vat_payable',
]

export function Vat2550qTable({ clientId, quarter, year }: Props) {
  const { data, isFetching, isError } = useQuery({
    queryKey: ['vat-2550q', clientId, quarter, year],
    queryFn:  () => fetchVat2550q({ clientId, quarter, year }),
  })

  if (isFetching) {
    return <div className="p-10 text-center text-sm text-t-muted">Loading…</div>
  }
  if (isError || !data) {
    return <div className="p-10 text-center text-sm text-red-500">Failed to load report.</div>
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

  const thCls  = 'px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-t-muted border-b border-t-line whitespace-nowrap'
  const thRCls = 'px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-t-muted border-b border-t-line whitespace-nowrap'
  const tdCls  = 'px-5 py-3 text-[13px] text-t-ink border-b border-t-line'
  const tdRCls = 'px-5 py-3 text-[13px] text-right text-t-ink border-b border-t-line'

  return (
    <div>
      <div className="px-6 py-4 border-b border-t-line">
        <div className="text-[13px] font-bold text-t-ink">{data.company.name}</div>
        {data.company.tin && (
          <div className="text-[12px] text-t-muted">TIN: {data.company.tin}</div>
        )}
        <div className="text-[12px] text-t-muted mt-1">
          Period: Q{data.quarter} {data.year}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-t-surface">
              <th className={thCls}>Month</th>
              {COL_LABELS.map((l) => <th key={l} className={thRCls}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.months.map((row) => (
              <tr key={row.month}>
                <td className={tdCls}>{row.label}</td>
                {COL_KEYS.map((k) => (
                  <td key={k} className={tdRCls}>{fmt(row[k] as number)}</td>
                ))}
              </tr>
            ))}
            <tr className="bg-t-surface">
              <td className={`${tdCls} font-bold`}>Totals</td>
              {COL_KEYS.map((k) => (
                <td key={k} className={`${tdRCls} font-bold`}>{fmt(data.totals[k])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
