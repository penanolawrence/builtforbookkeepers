'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

async function fetchAccountantClients() {
  const page = await getAccountantClients({ per_page: 100 })
  return page.data
}

export default function AccountantBIRPage() {
  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <Suspense>
        <BIRBooksView fetchClients={fetchAccountantClients} />
      </Suspense>
    </div>
  )
}
