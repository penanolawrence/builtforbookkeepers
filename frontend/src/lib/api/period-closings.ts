import api from './client'
import type {
  ClientClosingSummary,
  MonthEntry,
  ClosingPreview,
  PeriodClosingRecord,
  MonthStatus,
} from '@/types/period-closing'

export async function getPeriodClosingList(params?: {
  search?: string
  status?: MonthStatus
  accountantId?: string
}): Promise<ClientClosingSummary[]> {
  const { data } = await api.get<{ data: ClientClosingSummary[] }>('/period-closings', { params })
  return data.data
}

export async function getClientTimeline(companyId: string): Promise<MonthEntry[]> {
  const { data } = await api.get<{ months: MonthEntry[] }>(`/period-closings/${companyId}`)
  return data.months
}

export async function getClosingPreview(
  companyId: string,
  year: number,
  month: number,
): Promise<ClosingPreview> {
  const { data } = await api.get<ClosingPreview>(
    `/period-closings/${companyId}/${year}/${month}/preview`
  )
  return data
}

export async function executeClose(
  companyId: string,
  year: number,
  month: number,
): Promise<PeriodClosingRecord> {
  const { data } = await api.post<PeriodClosingRecord>(
    `/period-closings/${companyId}/${year}/${month}`
  )
  return data
}
