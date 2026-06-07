'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

export default function AccountantBIRPage() {
  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <Suspense>
        <BIRBooksView fetchClients={getAccountantClients} />
      </Suspense>
    </div>
  )
}
