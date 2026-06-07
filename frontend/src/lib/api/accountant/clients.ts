import api from '../client'
import type { ClientProfile } from '@/types/admin'
import type { Document } from '@/types/document'

export async function getAccountantClients(): Promise<ClientProfile[]> {
  const { data } = await api.get<ClientProfile[]>('/accountant/clients')
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
  params?: { status?: string; type?: string; start?: string; end?: string }
): Promise<Document[]> {
  const { data } = await api.get<Document[]>(`/accountant/clients/${id}/documents`, { params })
  return data
}
