'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'
import { getClients } from '@/lib/api/admin/clients'

async function fetchAdminClients() {
  const res = await getClients()
  return res.data
}

export default function AdminBIRPage() {
  return (
    <Suspense>
      <BIRBooksView fetchClients={fetchAdminClients} />
    </Suspense>
  )
}
