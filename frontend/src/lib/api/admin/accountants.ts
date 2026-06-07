import api from '../client'
import type { Accountant } from '@/types/admin'

export async function getAccountants(): Promise<Accountant[]> {
  const { data } = await api.get<Accountant[]>('/admin/accountants')
  return data
}

export async function getAccountant(id: string): Promise<Accountant & {
  assignedClients: {
    id: string
    name: string
    email: string | null
    plan: string
    birType: string
    clientStatus: string | null
    redCount: number
  }[]
  yellowCount: number
  greenCount: number
  createdAt: string | null
}> {
  const { data } = await api.get(`/admin/accountants/${id}`)
  return data
}

export async function createAccountant(data: {
  name: string
  email: string
  mobile?: string
}): Promise<{ userId: string }> {
  const { data: result } = await api.post<{ userId: string }>('/admin/accountants', data)
  return result
}

export async function updateAccountant(
  id: string,
  data: { name: string; email: string; mobile?: string | null }
): Promise<{ id: string; name: string; email: string; mobile: string | null }> {
  const { data: result } = await api.put(`/admin/accountants/${id}`, data)
  return result
}

export async function resetAccountantPassword(id: string): Promise<void> {
  await api.post(`/admin/accountants/${id}/reset-password`)
}

export async function deactivateAccountant(
  id: string,
  replacementAccountantId?: string
): Promise<void> {
  await api.post(`/admin/accountants/${id}/deactivate`, { replacementAccountantId })
}
