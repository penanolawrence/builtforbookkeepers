import api from '../client'
import type { ClientProfile, PagedClients } from '@/types/admin'
import type { PagedDocs } from '@/types/document'

export async function getAccountantClients(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<PagedClients> {
  const { data } = await api.get<PagedClients>('/accountant/clients', { params })
  return data
}

export async function getAccountantClient(id: string): Promise<ClientProfile & {
  queueCounts: { red: number; yellow: number; green: number }
  pendingEntries: number
  draftEntries: number
}> {
  const { data } = await api.get(`/accountant/clients/${id}`)
  return data
}

export async function getAccountantClientDocuments(
  id: string,
  params?: { status?: string; type?: string; start?: string; end?: string; page?: number; per_page?: number }
): Promise<PagedDocs> {
  const { data } = await api.get<PagedDocs>(`/accountant/clients/${id}/documents`, { params })
  return data
}
