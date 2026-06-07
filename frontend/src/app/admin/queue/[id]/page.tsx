'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQueueItem } from '@/lib/api/queue'
import { ReviewPanel } from '@/components/queue/ReviewPanel'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default function AdminQueueItemPage({ params }: Props) {
  const { id } = params

  const { data: item, isLoading } = useQuery({
    queryKey: ['queue-item', id],
    queryFn: () => getQueueItem(id),
  })

  if (isLoading) return <p className="text-sm text-t-faint p-6">Loading...</p>
  if (!item) return <p className="text-sm text-red-600 p-6">Item not found.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/queue"
          className="flex items-center gap-1.5 text-xs font-medium text-t-muted hover:text-t-ink transition-colors"
        >
          ← Back to Queue
        </Link>
      </div>
      <ReviewPanel item={item} isVat={item.isVat} backUrl="/admin/queue" />
    </div>
  )
}
