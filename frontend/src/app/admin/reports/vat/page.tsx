'use client'

import { Suspense } from 'react'
import { VatReportView } from '@/components/reports/VatReportView'
import { getClients } from '@/lib/api/admin/clients'

export default function AdminVatReportPage() {
  return (
    <Suspense>
      <VatReportView
        fetchClients={() => getClients({ birType: 'vat' }).then((r: any) => r.data ?? [])}
        breadcrumbBase={{ label: 'Reports', href: '/admin/reports' }}
      />
    </Suspense>
  )
}
