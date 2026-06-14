import { Suspense } from 'react'
import { VatReportView } from '@/components/reports/VatReportView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

export default function AccountantVatReportPage() {
  return (
    <Suspense>
      <VatReportView
        fetchClients={() => getAccountantClients({ per_page: 100 }).then((r) => r.data)}
        breadcrumbBase={{ label: 'Reports', href: '/accountant/reports' }}
      />
    </Suspense>
  )
}
