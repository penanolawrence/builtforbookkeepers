'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSocket } from '@/lib/socket/SocketProvider'
import {
  getNotifications,
  getUnreadCount,
  markRead,
  type Notification,
} from '@/lib/api/notifications'
import { NOTIFICATION_NEW } from '@/lib/socket/events'

export function useNotifications() {
  const { echo } = useSocket()
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchAll = useCallback(async () => {
    const [countData, notifData] = await Promise.all([
      getUnreadCount(),
      getNotifications(),
    ])
    setCount(countData.count)
    setNotifications(notifData.slice(0, 10))
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!echo) return

    const user = localStorage.getItem('sofia_user')
    if (!user) return
    const parsed = JSON.parse(user)

    let channelName: string
    if (parsed.role === 'admin') {
      channelName = 'admin.1'
    } else if (parsed.role === 'accountant') {
      channelName = `accountant.${parsed.id}`
    } else {
      channelName = `client.${parsed.companyId}`
    }

    const channel = echo.private(channelName)

    channel.listen(`.${NOTIFICATION_NEW}`, (event: Notification) => {
      setCount((c) => c + 1)
      setNotifications((prev) => [event, ...prev].slice(0, 10))
    })

    return () => {
      channel.stopListening(`.${NOTIFICATION_NEW}`)
    }
  }, [echo])

  const markAllRead = useCallback(async () => {
    await markRead(undefined, true)
    setCount(0)
  }, [])

  return { count, notifications, markAllRead, refetch: fetchAll }
}
