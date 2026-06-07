import api from './client'
import type { IncomeStatement, ExpenseBreakdown } from '@/types/report'

export async function getIncomeStatement(params: {
  clientId?: string
  start: string
  end: string
}): Promise<IncomeStatement> {
  const { data } = await api.get<IncomeStatement>('/reports/income-statement', { params })
  return data
}

export async function getExpenseBreakdown(params: {
  clientId?: string
  start: string
  end: string
}): Promise<ExpenseBreakdown> {
  const { data } = await api.get<ExpenseBreakdown>('/reports/expense-breakdown', { params })
  return data
}

export async function downloadReportPDF(
  type: 'income-statement' | 'expense-breakdown',
  params: { clientId?: string; start: string; end: string }
): Promise<void> {
  const { data } = await api.get(`/reports/${type}/pdf`, {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}-${params.start}-${params.end}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
