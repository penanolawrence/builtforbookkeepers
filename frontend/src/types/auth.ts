export type Role = 'admin' | 'accountant' | 'client'
export type AccountStatus = 'ACTIVE' | 'OVERDUE' | 'SUSPENDED' | 'INACTIVE'

export interface User {
  id: string
  role: Role
  name: string
  email: string | null
  mobile: string | null
  username: string | null
  tin: string | null
  companyId: string | null
  status: AccountStatus
  birType?: 'vat' | 'non_vat'
}
