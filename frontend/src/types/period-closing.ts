export type MonthStatus = 'closed' | 'ready' | 'blocked' | 'future' | 'up_to_date'

export interface ClientClosingSummary {
  companyId: string
  companyName: string
  accountantId: string
  accountantName: string | null
  lastClosed: string | null
  nextPeriod: string | null
  nextPeriodYear: number | null
  nextPeriodMonth: number | null
  status: MonthStatus
  pendingDocs: number
  pendingAJEs: number
}

export interface MonthEntry {
  year: number
  month: number
  label: string
  status: MonthStatus
  pendingDocs: number
  pendingAJEs: number
}

export interface ClosingEntryLine {
  accountId: string
  accountName: string
  accountCode: string
  amount: number
  side: 'debit' | 'credit'
}

export interface ClosingPreview {
  incomeGroup: ClosingEntryLine[]
  expenseGroup: ClosingEntryLine[]
  totalIncome: number
  totalExpense: number
}

export interface PeriodClosingRecord {
  id: string
  periodYear: number
  periodMonth: number
  closedAt: string
  closedBy: string
}
