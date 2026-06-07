import { Badge } from '@/components/ui/badge'
import type { EntryStatus } from '@/types/adjusting-entry'

const STYLES: Record<EntryStatus, string> = {
  DRAFT: 'bg-t-surface text-t-ink border-t-line',
  PENDING: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
}

const LABELS: Record<EntryStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  return <Badge className={STYLES[status]}>{LABELS[status]}</Badge>
}
