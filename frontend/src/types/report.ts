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

export interface VatCompany {
  name: string
  tin: string | null
  address: string | null
}

export interface Vat2550mData {
  month: number
  year: number
  period_label: string
  taxable_sales: number
  output_vat: number
  taxable_purchases: number
  input_vat: number
  net_vat_payable: number
  company: VatCompany
}

export interface Vat2550qMonthRow {
  month: number
  label: string
  taxable_sales: number
  output_vat: number
  taxable_purchases: number
  input_vat: number
  net_vat_payable: number
}

export interface Vat2550qTotals {
  taxable_sales: number
  output_vat: number
  taxable_purchases: number
  input_vat: number
  net_vat_payable: number
}

export interface Vat2550qData {
  quarter: number
  year: number
  months: Vat2550qMonthRow[]
  totals: Vat2550qTotals
  company: VatCompany
}

export interface VatSlsRow {
  date: string
  ref_number: string | null
  buyer_name: string | null
  buyer_tin: string | null
  taxable_amount: number
  vat_amount: number
  total_amount: number
}

export interface VatSlpRow {
  date: string
  ref_number: string | null
  supplier_name: string | null
  supplier_tin: string | null
  taxable_amount: number
  input_vat: number
  total_amount: number
}

export interface VatSlsData {
  quarter: number
  year: number
  rows: VatSlsRow[]
  totals: { taxable_amount: number; vat_amount: number; total_amount: number }
  company: VatCompany
}

export interface VatSlpData {
  quarter: number
  year: number
  rows: VatSlpRow[]
  totals: { taxable_amount: number; input_vat: number; total_amount: number }
  company: VatCompany
}

export interface NonVat2551qMonthRow {
  month: number
  label: string
  gross_receipts: number
  percentage_tax: number
}

export interface NonVat2551qData {
  quarter: number
  year: number
  months: NonVat2551qMonthRow[]
  totals: {
    gross_receipts: number
    percentage_tax: number
  }
  company: { name: string; tin: string | null; address: string | null }
}

export interface AlphaListRow {
  tin: string
  payeeName: string
  address: string
  atcCode: string
  natureOfIncome: string
  grossPayment: number
  rate: number
  ewtAmount: number
}

export interface AlphaListData {
  rows: AlphaListRow[]
  period: { start: string; end: string }
}
