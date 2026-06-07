'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'

export default function BIRPage() {
  return (
    <Suspense>
      <BIRBooksView />
    </Suspense>
  )
}
