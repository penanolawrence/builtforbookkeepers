'use client'

import { Suspense } from 'react'
import { AlphaListView } from '@/components/reports/AlphaListView'
import { getClients } from '@/lib/api/admin/clients'

interface Props {
  params: { clientId: string }
}

async function fetchAdminClients() {
  const res = await getClients()
  return res.data
}

export default function AdminAlphaListPage({ params }: Props) {
  return (
    <Suspense>
      <AlphaListView
        clientId={params.clientId}
        fetchClients={fetchAdminClients}
        breadcrumbBase={{ label: 'Reports', href: '/admin/reports' }}
      />
    </Suspense>
  )
}
