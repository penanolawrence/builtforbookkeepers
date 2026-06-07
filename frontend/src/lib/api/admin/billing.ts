import api from '../client'
import type { PaymentRecord } from '@/types/admin'

export async function getPayments(params?: {
  clientId?: string
  start?: string
  end?: string
}): Promise<PaymentRecord[]> {
  const { data } = await api.get<PaymentRecord[]>('/admin/billing', { params })
  return data
}

export async function getClientPayments(clientId: string): Promise<PaymentRecord[]> {
  const { data } = await api.get<PaymentRecord[]>(`/admin/billing/${clientId}`)
  return data
}

export async function receivePayment(
  clientId: string,
  data: { amount: number; dateReceived: string; referenceNumber: string }
): Promise<{ paymentId: string }> {
  const { data: result } = await api.post<{ paymentId: string }>(
    `/admin/billing/${clientId}`,
    data
  )
  return result
}
