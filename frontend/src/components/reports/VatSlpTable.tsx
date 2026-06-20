'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchVatSlp } from '@/lib/api/reports'

interface Props {
  clientId?: string
  quarter: number
  year: number
}

export function VatSlpTable({ clientId, quarter, year }: Props) {
  const { data, isFetching, isError } = useQuery({
    queryKey: ['vat-slp', clientId, quarter, year],
    queryFn:  () => fetchVatSlp({ clientId, quarter, year }),
  })

  if (isFetching) {
    return <div className="p-10 text-center text-sm text-t-muted">Loading…</div>
  }
  if (isError || !data) {
    return <div className="p-10 text-center text-sm text-red-500">Failed to load report.</div>
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

  const headers = [
    'Date', 'Invoice No.', 'Supplier Name', 'Supplier TIN', 'Supplier Address',
    'Taxable Amount', 'Input VAT', 'Total Amount',
  ]
  const thCls  = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-t-muted border-b border-t-line whitespace-nowrap'
  const tdCls  = 'px-4 py-2.5 text-[13px] text-t-ink border-b border-t-line'
  const tdRCls = 'px-4 py-2.5 text-[13px] text-right text-t-ink border-b border-t-line'

  return (
    <div>
      <div className="px-6 py-4 border-b border-t-line">
        <div className="text-[13px] font-bold text-t-ink">{data.company.name}</div>
        {data.company.tin && (
          <div className="text-[12px] text-t-muted">TIN: {data.company.tin}</div>
        )}
        <div className="text-[12px] text-t-muted mt-1">
          Q{data.quarter} {data.year} — Summary List of Purchases
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-t-surface">
              {headers.map((h) => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[13px] text-t-muted">
                  No purchases found for this period.
                </td>
              </tr>
            ) : (
              <>
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    <td className={tdCls}>{row.date}</td>
                    <td className={tdCls}>{row.ref_number ?? '—'}</td>
                    <td className={tdCls}>{row.supplier_name ?? '—'}</td>
                    <td className={tdCls}>{row.supplier_tin ?? '—'}</td>
                    <td className={tdCls}>{row.supplier_address ?? '—'}</td>
                    <td className={tdRCls}>{fmt(row.taxable_amount)}</td>
                    <td className={tdRCls}>{fmt(row.input_vat ?? 0)}</td>
                    <td className={tdRCls}>{fmt(row.total_amount)}</td>
                  </tr>
                ))}
                <tr className="bg-t-surface">
                  <td colSpan={5} className="px-4 py-3 text-[13px] font-bold text-t-ink">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-right text-t-ink">
                    {fmt(data.totals.taxable_amount)}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-right text-t-ink">
                    {fmt(data.totals.input_vat)}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-right text-t-ink">
                    {fmt(data.totals.total_amount)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
