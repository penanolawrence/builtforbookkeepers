'use client'

import { Suspense } from 'react'
import { AlphaListView } from '@/components/reports/AlphaListView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

interface Props {
  params: { clientId: string }
}

async function fetchAccountantClients() {
  const page = await getAccountantClients({ per_page: 100 })
  return page.data
}

export default function AccountantAlphaListPage({ params }: Props) {
  return (
    <Suspense>
      <AlphaListView
        clientId={params.clientId}
        fetchClients={fetchAccountantClients}
        breadcrumbBase={{ label: 'Reports', href: '/accountant/reports' }}
      />
    </Suspense>
  )
}
