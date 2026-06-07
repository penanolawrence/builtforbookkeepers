import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AccountStatus } from '@/types/auth'

interface Props {
  status: AccountStatus
}

const config: Record<AccountStatus, { label: string; className: string; tooltip?: string }> = {
  ACTIVE:    { label: 'Active',    className: 'bg-green-100 text-green-800 border-green-200' },
  OVERDUE:   { label: 'Overdue',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SUSPENDED: { label: 'Suspended', className: 'bg-orange-100 text-orange-800 border-orange-200', tooltip: 'Temporary (reversible)' },
  INACTIVE:  { label: 'Inactive',  className: 'bg-gray-100 text-gray-600 border-gray-200',        tooltip: 'Permanent (cannot reactivate)' },
}

export function ClientStatusBadge({ status }: Props) {
  const key = status.toUpperCase() as AccountStatus
  const { label, className, tooltip } = config[key] ?? config['ACTIVE']
  const badge = (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
  if (!tooltip) return badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
