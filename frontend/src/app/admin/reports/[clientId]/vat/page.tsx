import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

interface Props {
  params: { clientId: string }
}

export default function AdminVatReportPage({ params }: Props) {
  return (
    <Suspense>
      <VatReportContent
        clientId={params.clientId}
        breadcrumbBase={{ label: 'Reports', href: '/admin/reports' }}
      />
    </Suspense>
  )
}
