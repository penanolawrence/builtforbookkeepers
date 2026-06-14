import api from './client'
import type { IncomeStatement, ExpenseBreakdown, VatReportType, VatPdfParams } from '@/types/report'

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

export async function downloadVatPdf(
  type: VatReportType,
  params: VatPdfParams
): Promise<void> {
  const { data } = await api.get(`/reports/vat/${type}/pdf`, {
    params,
    responseType: 'blob',
  })
  const url      = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const filename = buildVatFilename(type, params)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildVatFilename(type: VatReportType, params: VatPdfParams): string {
  const year = params.year
  if (type === '2550m') return `2550m-${year}-${String(params.month).padStart(2, '0')}.pdf`
  return `${type}-${year}-Q${params.quarter}.pdf`
}
