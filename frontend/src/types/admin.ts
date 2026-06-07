import type { AccountStatus } from './auth'

export interface Company {
  id: string
  name: string
  mobile: string
  email: string | null
  tin: string | null
  contactPerson: string | null
  birType: 'vat' | 'non_vat'
  plan: 'starter' | 'growth' | 'premium'
  accountantId: string
}

export interface ClientProfile extends Company {
  clientId: string
  clientStatus: AccountStatus
  username: string
  accountantName: string
  lastPayment: { amount: number; dateReceived: string; referenceNumber: string } | null
}

export interface Accountant {
  id: string
  name: string
  email: string
  mobile: string | null
  clientCount: number
  redCount: number
  pendingEntries: number
  status: string
  createdAt: string | null
}

export interface PaymentRecord {
  id: string
  companyId: string
  companyName: string | null
  amount: number
  dateReceived: string
  referenceNumber: string
  recordedBy: string | null
  createdAt: string
}

export interface Account {
  id: string
  code: string
  name: string
  type: 'income' | 'expense' | 'cash' | 'vat' | 'equity'
  chartOfAccountId?: string | null
  isSystemManaged: boolean
  isActive: boolean
}
