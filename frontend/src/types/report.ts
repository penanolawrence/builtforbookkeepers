export interface SubtypeLine {
  name: string
  total: number
}

export interface ReportLine {
  accountCode: string
  accountName: string
  total: number
  subtypes: SubtypeLine[]
}

export interface ReportTotals {
  totalIncome: number
  totalExpenses: number
  netIncome: number
}

export interface IncomeStatement {
  income: ReportLine[]
  expenses: ReportLine[]
  totals: ReportTotals
  period: { start: string; end: string }
}

export interface ExpenseBreakdown {
  expenses: ReportLine[]
  grandTotal: number
}

export interface BIRRow {
  [key: string]: string | number | null
}

export interface BIRBook {
  rows: BIRRow[]
  isVat: boolean
}

export interface GLRow {
  date: string
  accountName: string
  subtype: string | null
  description: string
  ref: string | null
  debit: number | null
  credit: number | null
  runningBalance: number
}

export interface GLBook {
  account: { code: string; name: string; normalBalance: 'debit' | 'credit' }
  openingBalance: number
  parkedCount: number
  rows: GLRow[]
}

export type VatReportType = '2550m' | '2550q' | 'sls' | 'slp'

export interface VatPdfParams {
  clientId?: string
  month?: number
  year: number
  quarter?: number
}
