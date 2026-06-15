import api from './client'
import type { QueueItem, QueueItemDetail, JournalPreviewLine } from '@/types/queue'

export type { JournalPreviewLine }

export interface LinePayload {
  id?: string
  type?: 'income' | 'expense'
  accountId?: string | null
  accountCode?: string | null
  subtypeId?: string | null
  amount?: number
  description?: string | null
  date?: string | null
}

export async function getQueue(params?: { clientId?: string }): Promise<QueueItem[]> {
  const { data } = await api.get<QueueItem[]>('/queue', { params })
  return data
}

export async function getQueueItem(id: string): Promise<QueueItemDetail> {
  const { data } = await api.get<QueueItemDetail>(`/queue/${id}`)
  return data
}

export async function approveItem(
  id: string,
  payload?: {
    fields?: Record<string, unknown>
    lines?: LinePayload[]
    removedLineIds?: string[]
  }
): Promise<void> {
  await api.post(`/queue/${id}/approve`, payload)
}

export async function returnItem(id: string, note: string): Promise<void> {
  await api.post(`/queue/${id}/return`, { note })
}

export async function rejectItem(id: string, reason: string): Promise<void> {
  await api.post(`/queue/${id}/reject`, { reason })
}

export async function reclassifyItem(id: string): Promise<void> {
  await api.post(`/queue/${id}/reclassify`)
}

export async function batchApprove(
  ids: string[]
): Promise<{ approved: string[]; failed: { id: string; reason: string }[] }> {
  const { data } = await api.post('/queue/batch-approve', { ids })
  return data
}
