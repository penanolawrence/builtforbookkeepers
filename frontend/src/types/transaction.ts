export interface JournalLine {
  accountCode: string
  accountName: string
  debit: number | null
  credit: number | null
}

export interface JournalEntry {
  id: string
  documentId: string | null
  adjustingEntryId: string | null
  date: string
  description: string
  lines: JournalLine[]
  approvedBy: string
  approvedAt: string
}
