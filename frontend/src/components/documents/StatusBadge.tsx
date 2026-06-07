import { Badge } from '@/components/ui/badge'
import type { DocumentStatus, FlagColor } from '@/types/document'

interface Props {
  status: DocumentStatus
  flag?: FlagColor | null
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  PROCESSING: { label: 'Processing...', className: 'bg-blue-100 text-blue-800' },
  PARKED:     { label: 'In Review',     className: 'bg-yellow-100 text-yellow-800' },
  APPROVED:   { label: 'Approved',      className: 'bg-green-100 text-green-800' },
  RETURNED:   { label: 'Returned',      className: 'bg-orange-100 text-orange-800' },
  REJECTED:   { label: 'Rejected',      className: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'Withdrawn',     className: 'bg-gray-100 text-gray-500' },
}

const FLAG_CONFIG: Record<FlagColor, { label: string; className: string }> = {
  RED: { label: 'RED', className: 'bg-red-100 text-red-800' },
  YELLOW: { label: 'YELLOW', className: 'bg-yellow-100 text-yellow-800' },
  GREEN: { label: 'GREEN', className: 'bg-green-100 text-green-800' },
}

export function StatusBadge({ status, flag }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-1">
      <Badge className={config.className}>{config.label}</Badge>
      {status === 'PARKED' && flag && (
        <Badge className={FLAG_CONFIG[flag].className}>{FLAG_CONFIG[flag].label}</Badge>
      )}
    </div>
  )
}
