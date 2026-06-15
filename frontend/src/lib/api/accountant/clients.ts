import api from '../client'
import type { ClientProfile, PagedClients } from '@/types/admin'
import type { PagedDocs } from '@/types/document'

export interface CreateClientPayload {
  businessName:  string
  mobile:        string
  planType:      'starter' | 'growth' | 'premium'
  birType:       'vat' | 'non_vat'
  tin?:          string
  email?:        string
  contactPerson?: string
}

export interface CreateClientResult {
  companyId:  string
  inviteLink: string
  username:   string
}

export async function createAccountantClient(payload: CreateClientPayload): Promise<CreateClientResult> {
  const { data } = await api.post<CreateClientResult>('/accountant/clients', payload)
  return data
}

export async function getAccountantClients(params?: {
  page?: number
  per_page?: number
  search?: string
  bir_type?: 'vat' | 'non_vat'
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

export async function updateAccountantClient(
  id: string,
  payload: { name?: string; mobile?: string; email?: string; contactPerson?: string; tin?: string }
): Promise<void> {
  await api.patch(`/accountant/clients/${id}`, payload)
}

export async function getAccountantClientDocuments(
  id: string,
  params?: { status?: string; type?: string; start?: string; end?: string; page?: number; per_page?: number }
): Promise<PagedDocs> {
  const { data } = await api.get<PagedDocs>(`/accountant/clients/${id}/documents`, { params })
  return data
}

export interface MerchantData {
  id: string
  name: string
  tin: string | null
  address: string | null
  documentCount: number
}

export async function getMerchants(clientId: string): Promise<MerchantData[]> {
  const { data } = await api.get<MerchantData[]>(`/accountant/clients/${clientId}/merchants`)
  return data
}

export async function createMerchant(
  clientId: string,
  payload: { name: string; tin?: string; address?: string }
): Promise<MerchantData> {
  const { data } = await api.post<MerchantData>(`/accountant/clients/${clientId}/merchants`, payload)
  return data
}

export async function updateMerchant(
  merchantId: string,
  payload: { name: string; tin?: string; address?: string }
): Promise<MerchantData> {
  const { data } = await api.patch<MerchantData>(`/accountant/merchants/${merchantId}`, payload)
  return data
}

export async function deleteMerchant(merchantId: string): Promise<void> {
  await api.delete(`/accountant/merchants/${merchantId}`)
}
