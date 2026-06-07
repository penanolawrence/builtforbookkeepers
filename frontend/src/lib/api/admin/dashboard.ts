import api from '../client'
import type { Accountant } from '@/types/admin'

export interface DashboardAccountant extends Accountant {
  yellowCount: number
  greenCount: number
  pendingEntries: number
}

export interface DashboardData {
  accountants: DashboardAccountant[]
  openRedItems: number
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/admin/dashboard')
  return data
}
