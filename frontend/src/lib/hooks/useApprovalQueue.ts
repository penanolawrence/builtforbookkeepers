'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSocket } from '@/lib/socket/SocketProvider'
import { getQueue, batchApprove as apiBatchApprove } from '@/lib/api/queue'
import { QUEUE_ITEM_ADDED, QUEUE_ITEM_REMOVED } from '@/lib/socket/events'
import type { QueueItem } from '@/types/queue'

export function useApprovalQueue() {
  const { echo } = useSocket()
  const [items, setItems] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getQueue()
      setItems(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('b4b:queue-count-changed', { detail: { count: items.length } }))
  }, [items.length])

  useEffect(() => {
    if (!echo) return

    const user = localStorage.getItem('b4b_user')
    if (!user) return
    const parsed = JSON.parse(user)
    const channelName = parsed.role === 'admin' ? 'private-admin.1' : `private-accountant.${parsed.id}`

    const channel = echo.private(channelName.replace('private-', ''))

    channel.listen(`.${QUEUE_ITEM_ADDED}`, () => {
      fetchQueue()
    })

    channel.listen(`.${QUEUE_ITEM_REMOVED}`, (event: { documentId: string }) => {
      setItems((prev) => prev.filter((item) => item.documentId !== event.documentId))
    })

    return () => {
      channel.stopListening(`.${QUEUE_ITEM_ADDED}`)
      channel.stopListening(`.${QUEUE_ITEM_REMOVED}`)
    }
  }, [echo, fetchQueue])

  const batchApprove = useCallback(
    async (ids: string[]) => {
      const result = await apiBatchApprove(ids)
      setItems((prev) => prev.filter((item) => !result.approved.includes(item.documentId)))
      return result
    },
    []
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.documentId !== id))
  }, [])

  return { items, isLoading, batchApprove, refetch: fetchQueue, removeItem }
}
