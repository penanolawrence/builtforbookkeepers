'use client'

import { Suspense } from 'react'
import { NonVatReportView } from '@/components/reports/NonVatReportView'
import { getClients } from '@/lib/api/admin/clients'

export default function AdminNonVatReportPage() {
  return (
    <Suspense>
      <NonVatReportView
        fetchClients={() => getClients({ birType: 'non_vat' }).then((r: any) => r.data ?? [])}
        breadcrumbBase={{ label: 'Reports', href: '/admin/reports' }}
      />
    </Suspense>
  )
}
