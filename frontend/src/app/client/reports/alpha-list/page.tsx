'use client'

import { Suspense } from 'react'
import { AlphaListView } from '@/components/reports/AlphaListView'

export default function AlphaListPage() {
  return (
    <Suspense>
      <AlphaListView />
    </Suspense>
  )
}
