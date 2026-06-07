export type DocumentStatus = 'PROCESSING' | 'PARKED' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'CANCELLED'
export type FlagColor = 'RED' | 'YELLOW' | 'GREEN'
export type DeclaredType = 'income' | 'expense'

export interface TransactionLine {
  id: string
  accountId: string | null
  accountCode: string | null
  accountName: string | null
  type: 'income' | 'expense'
  subtypeId: string | null
  subtypeName: string | null
  amount: number
  description: string | null
  date: string | null
}

export interface FieldOverrideEntry {
  field: string
  original: string
  override: string
}

export interface LineOverrideEntry {
  lineId: string
  field: string
  original: string
  override: string
}

export interface FieldOverrides {
  overriddenBy: string
  overriddenAt: string
  fields: FieldOverrideEntry[]
  lines: LineOverrideEntry[]
}

export interface Document {
  id: string
  companyId: string
  declaredType: DeclaredType
  status: DocumentStatus
  flag: FlagColor | null
  anomalyReasons: string[]
  merchantName: string | null
  date: string | null
  amount: number | null
  vatAmount: number | null
  category: string | null
  paymentMethod: string | null
  imageUrl: string
  isNoReceipt: boolean
  isOcrFailed: boolean
  returnNote: string | null
  rejectionReason: string | null
  expiresAt: string | null
  refNumber: string | null
  note: string | null
  inflow: number
  outflow: number
  transactionLines: TransactionLine[]
  fieldOverrides: FieldOverrides | null
  createdAt: string
  updatedAt: string
}
