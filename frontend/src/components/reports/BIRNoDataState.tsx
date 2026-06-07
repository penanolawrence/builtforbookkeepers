import { BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

const BOOK_LABELS: Record<string, string> = {
  crb: 'Cash Receipts Book (CRB)',
  cdb: 'Cash Disbursements Book (CDB)',
  gj: 'General Journal (GJ)',
  gl: 'General Ledger (GL)',
}

interface Props {
  book: string
  start: string
  end: string
}

export function BIRNoDataState({ book, start, end }: Props) {
  const label = BOOK_LABELS[book] ?? book.toUpperCase()
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-8">
      <div className="bg-t-primary-soft text-indigo-400 rounded-full p-3">
        <BookOpen className="h-9 w-9" />
      </div>
      <p className="text-sm font-semibold text-t-ink">No entries for this period</p>
      <p className="text-sm text-t-muted max-w-sm">
        There are no {label} records between{' '}
        <span className="font-semibold text-t-ink">{formatDate(start)}</span> and{' '}
        <span className="font-semibold text-t-ink">{formatDate(end)}</span>. This isn&apos;t an
        error — it just means no transactions have been recorded yet for this date range.
      </p>
    </div>
  )
}
