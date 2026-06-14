'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchVat2550m } from '@/lib/api/reports'

interface Props {
  clientId?: string
  month: number
  year: number
}

export function Vat2550mTable({ clientId, month, year }: Props) {
  const { data, isFetching, isError } = useQuery({
    queryKey: ['vat-2550m', clientId, month, year],
    queryFn:  () => fetchVat2550m({ clientId, month, year }),
  })

  if (isFetching) {
    return <div className="p-10 text-center text-sm text-t-muted">Loading…</div>
  }
  if (isError || !data) {
    return <div className="p-10 text-center text-sm text-red-500">Failed to load report.</div>
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

  const rows = [
    { label: 'Taxable Sales',       value: data.taxable_sales,     bold: false },
    { label: 'Output VAT Due',      value: data.output_vat,        bold: false },
    { label: 'Taxable Purchases',   value: data.taxable_purchases,  bold: false },
    { label: 'Input VAT Available', value: data.input_vat,         bold: false },
    { label: 'Net VAT Payable',     value: data.net_vat_payable,   bold: true  },
  ]

  return (
    <div>
      <div className="px-6 py-4 border-b border-t-line">
        <div className="text-[13px] font-bold text-t-ink">{data.company.name}</div>
        {data.company.tin && (
          <div className="text-[12px] text-t-muted">TIN: {data.company.tin}</div>
        )}
        <div className="text-[12px] text-t-muted mt-1">Period: {data.period_label}</div>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.bold ? 'bg-t-surface' : ''}>
              <td
                className={`px-6 py-3 text-[13px] text-t-ink border-b border-t-line ${row.bold ? 'font-bold' : ''}`}
              >
                {row.label}
              </td>
              <td
                className={`px-6 py-3 text-[13px] text-right text-t-ink border-b border-t-line ${row.bold ? 'font-bold' : ''}`}
              >
                {fmt(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
