import api from '../client'
import type { ClientProfile, Account } from '@/types/admin'
import type { Document, PagedDocs } from '@/types/document'

export async function getClients(params?: {
  search?: string
  status?: string
  accountantId?: string
  page?: number
  birType?: 'vat' | 'non_vat'
}): Promise<{ data: ClientProfile[]; pagination: { currentPage: number; perPage: number; total: number } }> {
  const { data } = await api.get('/admin/clients', { params })
  return data
}

export async function getClient(id: string): Promise<ClientProfile> {
  const { data } = await api.get<ClientProfile>(`/admin/clients/${id}`)
  return data
}

export async function createClient(data: {
  businessName: string
  mobile: string
  planType: string
  birType: string
  accountantId: string
  tin?: string
  email?: string
  contactPerson?: string
}): Promise<{ companyId: string; inviteLink: string; username: string }> {
  const { data: result } = await api.post('/admin/clients', data)
  return result
}

export async function updateClient(
  id: string,
  data: Partial<ClientProfile>
): Promise<void> {
  await api.patch(`/admin/clients/${id}`, data)
}

export async function updatePlan(
  id: string,
  data: { planType: string; birType: string }
): Promise<{ success: boolean; warning?: string }> {
  const { data: result } = await api.patch(`/admin/clients/${id}/plan`, data)
  return result
}

export async function suspendClient(id: string): Promise<void> {
  await api.post(`/admin/clients/${id}/suspend`)
}

export async function reactivateClient(id: string): Promise<void> {
  await api.post(`/admin/clients/${id}/reactivate`)
}

export async function deactivateClient(id: string): Promise<void> {
  await api.post(`/admin/clients/${id}/deactivate`)
}

export async function markClientOverdue(id: string): Promise<void> {
  await api.post(`/admin/clients/${id}/mark-overdue`)
}

export async function resetClientAccess(id: string): Promise<{ inviteLink: string }> {
  const { data } = await api.post(`/admin/clients/${id}/reset-access`)
  return data
}

export async function reassignAccountant(
  clientId: string,
  accountantId: string
): Promise<void> {
  await api.post(`/admin/clients/${clientId}/reassign`, { accountantId })
}

export async function getClientDocumentsAdmin(
  id: string,
  params?: { status?: string; type?: string; start?: string; end?: string; page?: number; per_page?: number }
): Promise<PagedDocs> {
  const { data } = await api.get<PagedDocs>(`/admin/clients/${id}/documents`, { params })
  return data
}

export async function getChartOfAccounts(clientId: string): Promise<Account[]> {
  const { data } = await api.get<Account[]>(`/admin/clients/${clientId}/accounts`)
  return data
}

export async function saveChartOfAccounts(
  clientId: string,
  accounts: Partial<Account>[]
): Promise<void> {
  await api.put(`/admin/clients/${clientId}/accounts`, { accounts })
}

export interface MerchantData {
  id: string
  name: string
  tin: string | null
  address: string | null
  documentCount: number
}

export async function getMerchants(clientId: string): Promise<MerchantData[]> {
  const { data } = await api.get<MerchantData[]>(`/admin/clients/${clientId}/merchants`)
  return data
}

export async function createMerchant(
  clientId: string,
  payload: { name: string; tin?: string; address?: string }
): Promise<MerchantData> {
  const { data } = await api.post<MerchantData>(`/admin/clients/${clientId}/merchants`, payload)
  return data
}

export async function updateMerchant(
  merchantId: string,
  payload: { name: string; tin?: string; address?: string }
): Promise<MerchantData> {
  const { data } = await api.patch<MerchantData>(`/admin/merchants/${merchantId}`, payload)
  return data
}

export async function deleteMerchant(merchantId: string): Promise<void> {
  await api.delete(`/admin/merchants/${merchantId}`)
}
