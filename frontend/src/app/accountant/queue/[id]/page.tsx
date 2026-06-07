'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQueueItem } from '@/lib/api/queue'
import { ReviewPanel } from '@/components/queue/ReviewPanel'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default function AccountantQueueItemPage({ params }: Props) {
  const { id } = params

  const { data: item, isLoading } = useQuery({
    queryKey: ['queue-item', id],
    queryFn: () => getQueueItem(id),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!item) return <p className="text-sm text-destructive">Item not found.</p>

  return (
    <div className="max-w-[1100px] mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accountant/queue">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Queue
          </Link>
        </Button>
      </div>
      <ReviewPanel item={item} isVat={item.isVat} backUrl="/accountant/queue" />
    </div>
  )
}
