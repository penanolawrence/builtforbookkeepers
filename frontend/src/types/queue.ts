import type { FlagColor, TransactionLine } from './document'

export interface QueueItem {
  documentId: string
  clientId: string
  clientName: string
  accountantName: string | null
  flag: FlagColor
  anomalyReasons: string[]
  merchantName: string | null
  amount: number | null
  vatAmount: number | null
  date: string | null
  category: string | null
  isNoReceipt: boolean
  isOcrFailed: boolean
  refNumber: string | null
  paymentMethod: string | null
  declaredType: 'income' | 'expense' | null
}

export interface JournalPreviewLine {
  accountCode: string
  accountName: string
  debit: number | null
  credit: number | null
}

export interface QueueItemDetail extends QueueItem {
  isVat: boolean
  merchantTin?: string | null
  note?: string | null
  journalPreview: JournalPreviewLine[]
  transactionLines: TransactionLine[]
}
