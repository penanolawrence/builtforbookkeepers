import api from '../client'

export interface Lead {
  id: string
  contact: string
  message: string | null
  is_read: boolean
  created_at: string
}

export async function getLeads(params?: {
  filter?: 'all' | 'unread' | 'read'
  page?: number
}): Promise<{ data: Lead[]; pagination: { currentPage: number; perPage: number; total: number } }> {
  const { data } = await api.get('/admin/leads', { params })
  return data
}

export async function toggleLeadRead(id: string): Promise<Lead> {
  const { data } = await api.patch<Lead>(`/admin/leads/${id}/toggle-read`)
  return data
}
