import { Suspense } from 'react'
import { VatReportView } from '@/components/reports/VatReportView'

export default function ClientVatReportPage() {
  return (
    <Suspense>
      <VatReportView
        breadcrumbBase={{ label: 'Reports', href: '/client/reports' }}
      />
    </Suspense>
  )
}
