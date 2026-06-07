export type EntryStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type EntryType = 'Reclassification' | 'Reversal' | 'Other'

export interface EntryLine {
  accountId?: string
  accountCode: string
  accountName: string
  subtypeId: string | null
  subtypeName: string | null
  debit: number | null
  credit: number | null
  description: string | null
}

export interface AdjustingEntry {
  id: string
  companyId: string
  companyName: string
  createdBy: string | null
  approvedBy: string | null
  rejectedBy: string | null
  status: EntryStatus
  type: EntryType
  date: string
  memo: string
  refNumber: string
  lines: EntryLine[]
  rejectionReason: string | null
  parentEntryId: string | null
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
}
