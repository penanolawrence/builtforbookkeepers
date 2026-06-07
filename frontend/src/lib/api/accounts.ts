import api from './client'
import type { Account } from '@/types/admin'

export async function getAccounts(clientId?: string): Promise<Account[]> {
  const { data } = await api.get<Account[]>('/accounts', {
    params: clientId ? { clientId } : undefined,
  })
  return data
}
