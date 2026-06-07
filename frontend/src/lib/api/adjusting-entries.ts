import api from './client'
import type { AdjustingEntry, EntryType } from '@/types/adjusting-entry'

export async function getEntries(params?: {
  clientId?: string
  status?: string
}): Promise<AdjustingEntry[]> {
  const { data } = await api.get<AdjustingEntry[]>('/adjusting-entries', { params })
  return data
}

export async function getEntry(id: string): Promise<AdjustingEntry> {
  const { data } = await api.get<AdjustingEntry>(`/adjusting-entries/${id}`)
  return data
}

export async function createEntry(data: {
  companyId: string
  date: string
  memo: string
  type: EntryType
  lines: {
    accountId: string
    subtypeId: string | null
    debit: number | null
    credit: number | null
    description: string | null
  }[]
}): Promise<{ entryId: string }> {
  const { data: result } = await api.post<{ entryId: string }>('/adjusting-entries', data)
  return result
}

export async function updateEntry(
  id: string,
  data: Partial<AdjustingEntry>
): Promise<void> {
  await api.patch(`/adjusting-entries/${id}`, data)
}

export async function submitEntry(id: string, selfApprove?: boolean): Promise<void> {
  await api.post(`/adjusting-entries/${id}/submit`, { selfApprove: selfApprove ?? false })
}

export async function deleteEntry(id: string): Promise<void> {
  await api.delete(`/adjusting-entries/${id}`)
}

export async function resubmitEntry(rejectedId: string): Promise<{ entryId: string }> {
  const { data } = await api.post<{ entryId: string }>(
    `/adjusting-entries/${rejectedId}/resubmit`
  )
  return data
}

export async function approveEntry(id: string): Promise<void> {
  await api.post(`/adjusting-entries/${id}/approve`)
}

export async function rejectEntry(id: string, reason: string): Promise<void> {
  await api.post(`/adjusting-entries/${id}/reject`, { reason })
}
