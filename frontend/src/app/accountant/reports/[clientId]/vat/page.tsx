import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

interface Props {
  params: { clientId: string }
}

export default function AccountantVatReportPage({ params }: Props) {
  return (
    <Suspense>
      <VatReportContent
        clientId={params.clientId}
        breadcrumbBase={{ label: 'Reports', href: '/accountant/reports' }}
      />
    </Suspense>
  )
}
