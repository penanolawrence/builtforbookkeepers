'use client'

import { Suspense } from 'react'
import { NonVatReportView } from '@/components/reports/NonVatReportView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

export default function AccountantNonVatReportPage() {
  return (
    <Suspense>
      <NonVatReportView
        fetchClients={() => getAccountantClients({ per_page: 100, bir_type: 'non_vat' }).then((r) => r.data)}
        breadcrumbBase={{ label: 'Reports', href: '/accountant/reports' }}
      />
    </Suspense>
  )
}
