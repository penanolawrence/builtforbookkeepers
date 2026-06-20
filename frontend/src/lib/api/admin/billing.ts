import api from '../client'
import type { PaymentRecord, AccountantBillingRow, AccountantPaymentRecord } from '@/types/admin'

export interface ReceivePaymentData {
  amount: number
  dateReceived: string
  referenceNumber: string
}

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
  data: ReceivePaymentData
): Promise<{ paymentId: string }> {
  const { data: result } = await api.post<{ paymentId: string }>(
    `/admin/billing/${clientId}`,
    data
  )
  return result
}

export async function getAccountantsList(): Promise<AccountantBillingRow[]> {
  const { data } = await api.get<AccountantBillingRow[]>('/admin/billing/accountants')
  return data
}

export async function getAccountantPayments(userId: string): Promise<AccountantPaymentRecord[]> {
  const { data } = await api.get<AccountantPaymentRecord[]>(`/admin/billing/accountants/${userId}`)
  return data
}

export async function receiveAccountantPayment(
  userId: string,
  data: ReceivePaymentData
): Promise<{ paymentId: string }> {
  const { data: result } = await api.post<{ paymentId: string }>(
    `/admin/billing/accountants/${userId}`,
    data
  )
  return result
}
