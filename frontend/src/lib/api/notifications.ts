import api from './client'

export interface Notification {
  id: string
  type: string
  message: string
  data: unknown
  readAt: string | null
  createdAt: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/notifications')
  return data
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await api.get<{ count: number }>('/notifications/count')
  return data
}

export async function markRead(ids?: string[], all?: boolean): Promise<void> {
  if (all) {
    await api.post('/notifications/mark-read', { all: true })
  } else {
    await api.post('/notifications/mark-read', { ids })
  }
}
