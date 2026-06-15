import { Suspense } from 'react'
import { NonVatReportView } from '@/components/reports/NonVatReportView'

export default function ClientNonVatReportPage() {
  return (
    <Suspense>
      <NonVatReportView
        breadcrumbBase={{ label: 'Reports', href: '/client/reports' }}
      />
    </Suspense>
  )
}
