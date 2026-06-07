import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { DashboardAccountant } from '@/lib/api/admin/dashboard'

interface Props {
  accountant: DashboardAccountant
}

export function AccountantWorkloadCard({ accountant }: Props) {
  return (
    <Link href={`/admin/accountants/${accountant.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{accountant.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{accountant.clientCount} clients</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {accountant.redCount} RED
            </Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              {accountant.yellowCount} YELLOW
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              {accountant.greenCount} GREEN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{accountant.pendingEntries} pending entries</p>
        </CardContent>
      </Card>
    </Link>
  )
}
