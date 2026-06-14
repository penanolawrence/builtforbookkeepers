import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

export default function ClientVatReportPage() {
  return (
    <Suspense>
      <VatReportContent
        breadcrumbBase={{ label: 'Reports', href: '/client/reports' }}
      />
    </Suspense>
  )
}
