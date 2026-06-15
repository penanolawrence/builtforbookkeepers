import api from './client'
import type { IncomeStatement, ExpenseBreakdown, VatReportType, VatPdfParams, Vat2550mData, Vat2550qData, VatSlsData, VatSlpData, NonVat2551qData } from '@/types/report'

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

export async function fetchVat2550m(params: {
  clientId?: string
  month: number
  year: number
}): Promise<Vat2550mData> {
  const { data } = await api.get('/reports/vat/2550m', { params })
  return data
}

export async function fetchVat2550q(params: {
  clientId?: string
  quarter: number
  year: number
}): Promise<Vat2550qData> {
  const { data } = await api.get('/reports/vat/2550q', { params })
  return data
}

export async function fetchVatSls(params: {
  clientId?: string
  quarter: number
  year: number
}): Promise<VatSlsData> {
  const { data } = await api.get('/reports/vat/sls', { params })
  return data
}

export async function fetchVatSlp(params: {
  clientId?: string
  quarter: number
  year: number
}): Promise<VatSlpData> {
  const { data } = await api.get('/reports/vat/slp', { params })
  return data
}

export async function fetchNonVat2551q(params: {
  clientId?: string
  quarter: number
  year: number
}): Promise<NonVat2551qData> {
  const { data } = await api.get<NonVat2551qData>('/reports/non-vat/2551q', { params })
  return data
}

export async function downloadNonVatPdf(params: {
  clientId?: string
  quarter: number
  year: number
}): Promise<void> {
  const { data } = await api.get('/reports/non-vat/2551q/pdf', {
    params,
    responseType: 'blob',
  })
  const url      = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const filename = `2551q-${params.year}-Q${params.quarter}.pdf`
  const a        = document.createElement('a')
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}
