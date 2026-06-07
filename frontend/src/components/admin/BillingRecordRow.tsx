import type { PaymentRecord } from '@/types/admin'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

interface Props {
  record: PaymentRecord
  clientName?: string
}

export function BillingRecordRow({ record, clientName }: Props) {
  return (
    <tr className="border-t text-sm">
      <td className="px-3 py-2">{formatDate(record.dateReceived)}</td>
      <td className="px-3 py-2">{formatCurrency(record.amount)}</td>
      <td className="px-3 py-2 text-muted-foreground">{record.referenceNumber}</td>
      {clientName !== undefined && <td className="px-3 py-2">{clientName}</td>}
    </tr>
  )
}
