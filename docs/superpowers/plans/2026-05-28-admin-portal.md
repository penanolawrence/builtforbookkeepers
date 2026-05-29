# Admin Portal (Step 5.6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full admin portal — client/accountant management, billing, queue, adjusting entries approval, and reports.

**Architecture:** All shared components (QueueTable, ReviewPanel, EntryForm, report components) are imported unchanged. Admin-specific components live in `components/admin/`. Pages live in `app/(admin)/`.

**Tech Stack:** Next.js 14 App Router, TypeScript, shadcn/ui, TanStack Query v5, react-hook-form + zod, Axios

---

## File Map

**New files — API:**
- `lib/api/admin/dashboard.ts`

**New files — Layout:**
- `components/layout/AdminSidebar.tsx`

**New files — Components:**
- `components/admin/ClientStatusBadge.tsx`
- `components/admin/BillingRecordRow.tsx`
- `components/admin/AccountantWorkloadCard.tsx`
- `components/admin/ClientTable.tsx`
- `components/admin/AssignAccountantModal.tsx`
- `components/admin/SuspendClientModal.tsx`
- `components/admin/DeactivateClientModal.tsx`
- `components/admin/ReceivePaymentModal.tsx`

**New files — Layout + Pages:**
- `app/(admin)/layout.tsx`
- `app/(admin)/dashboard/page.tsx`
- `app/(admin)/clients/page.tsx`
- `app/(admin)/clients/create/page.tsx`
- `app/(admin)/clients/[id]/page.tsx`
- `app/(admin)/clients/[id]/edit/page.tsx`
- `app/(admin)/accountants/page.tsx`
- `app/(admin)/accountants/create/page.tsx`
- `app/(admin)/accountants/[id]/page.tsx`
- `app/(admin)/billing/page.tsx`
- `app/(admin)/billing/[clientId]/page.tsx`
- `app/(admin)/queue/page.tsx`
- `app/(admin)/queue/[id]/page.tsx`
- `app/(admin)/adjusting-entries/page.tsx`
- `app/(admin)/adjusting-entries/new/page.tsx`
- `app/(admin)/adjusting-entries/[id]/page.tsx`
- `app/(admin)/reports/page.tsx`
- `app/(admin)/reports/[clientId]/income-statement/page.tsx`
- `app/(admin)/reports/[clientId]/expense-breakdown/page.tsx`
- `app/(admin)/reports/[clientId]/bir/[book]/page.tsx`
- `app/(admin)/settings/page.tsx`

**Reused (no changes):**
- `components/queue/QueueTable`, `ReviewPanel`
- `components/adjusting-entries/EntryForm`, `EntryStatusBadge`
- `components/reports/*`
- `components/documents/DocumentCard`, `StatusBadge`
- `components/shared/ConfirmModal`, `EmptyState`
- `components/layout/Topbar`
- `lib/api/admin/clients.ts`, `accountants.ts`, `billing.ts`

---

## Task 1: Dashboard API helper

**Files:**
- Create: `frontend/src/lib/api/admin/dashboard.ts`

- [ ] Create the file:

```typescript
import api from '../client'
import type { Accountant } from '@/types/admin'

export interface DashboardAccountant extends Accountant {
  yellowCount: number
  greenCount: number
  pendingEntries: number
}

export interface DashboardData {
  accountants: DashboardAccountant[]
  openRedItems: number
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/admin/dashboard')
  return data
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```
Expected: zero errors

- [ ] Commit:

```
git add frontend/src/lib/api/admin/dashboard.ts
git commit -m "feat: add admin dashboard API helper"
```

---

## Task 2: AdminSidebar

**Files:**
- Create: `frontend/src/components/layout/AdminSidebar.tsx`

- [ ] Create the file:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/accountants', label: 'Accountants' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/queue', label: 'Queue' },
  { href: '/admin/adjusting-entries', label: 'Adjusting Entries' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex w-56 flex-col border-r bg-background">
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(link.href)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/layout/AdminSidebar.tsx
git commit -m "feat: add AdminSidebar component"
```

---

## Task 3: ClientStatusBadge + BillingRecordRow

**Files:**
- Create: `frontend/src/components/admin/ClientStatusBadge.tsx`
- Create: `frontend/src/components/admin/BillingRecordRow.tsx`

- [ ] Create `ClientStatusBadge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AccountStatus } from '@/types/auth'

interface Props {
  status: AccountStatus
}

const config: Record<AccountStatus, { label: string; className: string; tooltip?: string }> = {
  ACTIVE:    { label: 'Active',    className: 'bg-green-100 text-green-800 border-green-200' },
  OVERDUE:   { label: 'Overdue',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SUSPENDED: { label: 'Suspended', className: 'bg-orange-100 text-orange-800 border-orange-200', tooltip: 'Temporary (reversible)' },
  INACTIVE:  { label: 'Inactive',  className: 'bg-gray-100 text-gray-600 border-gray-200',        tooltip: 'Permanent (cannot reactivate)' },
}

export function ClientStatusBadge({ status }: Props) {
  const { label, className, tooltip } = config[status]
  const badge = (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
  if (!tooltip) return badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

- [ ] Create `BillingRecordRow.tsx`:

```tsx
import type { PaymentRecord } from '@/types/admin'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

interface Props {
  record: PaymentRecord
  clientName?: string
}

export function BillingRecordRow({ record, clientName }: Props) {
  return (
    <tr className="border-t text-sm">
      <td className="px-3 py-2">{formatDate(record.dateReceived)}</td>
      <td className="px-3 py-2">{formatCurrency(record.amount)}</td>
      <td className="px-3 py-2 text-muted-foreground">{record.referenceNumber}</td>
      {clientName !== undefined && <td className="px-3 py-2">{clientName}</td>}
    </tr>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/admin/ClientStatusBadge.tsx frontend/src/components/admin/BillingRecordRow.tsx
git commit -m "feat: add ClientStatusBadge and BillingRecordRow"
```

---

## Task 4: AccountantWorkloadCard

**Files:**
- Create: `frontend/src/components/admin/AccountantWorkloadCard.tsx`

- [ ] Create the file:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { DashboardAccountant } from '@/lib/api/admin/dashboard'

interface Props {
  accountant: DashboardAccountant
}

export function AccountantWorkloadCard({ accountant }: Props) {
  return (
    <Link href={`/admin/accountants/${accountant.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{accountant.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{accountant.clientCount} clients</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {accountant.redCount} RED
            </Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              {accountant.yellowCount} YELLOW
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              {accountant.greenCount} GREEN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{accountant.pendingEntries} pending entries</p>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/admin/AccountantWorkloadCard.tsx
git commit -m "feat: add AccountantWorkloadCard component"
```

---

## Task 5: ClientTable

**Files:**
- Create: `frontend/src/components/admin/ClientTable.tsx`

- [ ] Create the file:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ClientStatusBadge } from './ClientStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/formatDate'
import type { ClientProfile, Accountant } from '@/types/admin'

interface Pagination {
  currentPage: number
  perPage: number
  total: number
}

interface Props {
  clients: ClientProfile[]
  pagination?: Pagination
  accountants?: Accountant[]
  onFilterChange: (f: { search?: string; status?: string; accountantId?: string; page?: number }) => void
}

export function ClientTable({ clients, pagination, accountants, onFilterChange }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [accountantId, setAccountantId] = useState('all')

  const apply = (overrides?: { search?: string; status?: string; accountantId?: string }) => {
    onFilterChange({
      search: (overrides?.search ?? search) || undefined,
      status: (overrides?.status ?? status) === 'all' ? undefined : (overrides?.status ?? status),
      accountantId: (overrides?.accountantId ?? accountantId) === 'all' ? undefined : (overrides?.accountantId ?? accountantId),
      page: 1,
    })
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search business name..."
          className="w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); apply({ status: v }) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {accountants && accountants.length > 0 && (
          <Select value={accountantId} onValueChange={(v) => { setAccountantId(v); apply({ accountantId: v }) }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All accountants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accountants</SelectItem>
              {accountants.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" onClick={() => apply()}>Search</Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState message="No clients found." />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Business Name</th>
                <th className="px-3 py-2 text-left font-medium">Accountant</th>
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-left font-medium">VAT</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.clientId}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/clients/${c.clientId}`)}
                >
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.accountantName}</td>
                  <td className="px-3 py-2 capitalize">{c.plan}</td>
                  <td className="px-3 py-2">{c.birType === 'vat' ? 'VAT' : 'Non-VAT'}</td>
                  <td className="px-3 py-2"><ClientStatusBadge status={c.clientStatus} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(c.createdAt ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="outline" size="sm"
            disabled={pagination.currentPage <= 1}
            onClick={() => onFilterChange({ page: pagination.currentPage - 1 })}
          >Prev</Button>
          <span>Page {pagination.currentPage} of {totalPages}</span>
          <Button
            variant="outline" size="sm"
            disabled={pagination.currentPage >= totalPages}
            onClick={() => onFilterChange({ page: pagination.currentPage + 1 })}
          >Next</Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/admin/ClientTable.tsx
git commit -m "feat: add ClientTable component"
```

---

## Task 6: AssignAccountantModal + SuspendClientModal

**Files:**
- Create: `frontend/src/components/admin/AssignAccountantModal.tsx`
- Create: `frontend/src/components/admin/SuspendClientModal.tsx`

- [ ] Create `AssignAccountantModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getAccountants } from '@/lib/api/admin/accountants'

interface Props {
  open: boolean
  clientId: string
  currentAccountantId: string
  onConfirm: (accountantId: string) => void
  onCancel: () => void
}

export function AssignAccountantModal({ open, currentAccountantId, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState(currentAccountantId)

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Accountant</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Assign to:</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select accountant..." /></SelectTrigger>
            <SelectContent>
              {(accountants ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(selected)} disabled={!selected}>Reassign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] Create `SuspendClientModal.tsx`:

```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  clientName: string
  isSuspended?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function SuspendClientModal({ open, clientName, isSuspended, onConfirm, onCancel, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSuspended ? 'Reactivate Client' : 'Suspend Client'}</DialogTitle>
          <DialogDescription>
            {isSuspended
              ? `Reactivate ${clientName}? They will regain login access.`
              : `Suspend ${clientName}? Client will immediately lose login access.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant={isSuspended ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSuspended ? 'Reactivate' : 'Suspend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/admin/AssignAccountantModal.tsx frontend/src/components/admin/SuspendClientModal.tsx
git commit -m "feat: add AssignAccountantModal and SuspendClientModal"
```

---

## Task 7: DeactivateClientModal + ReceivePaymentModal

**Files:**
- Create: `frontend/src/components/admin/DeactivateClientModal.tsx`
- Create: `frontend/src/components/admin/ReceivePaymentModal.tsx`

- [ ] Create `DeactivateClientModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  clientName: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DeactivateClientModal({ open, clientName, onConfirm, onCancel, loading }: Props) {
  const [typed, setTyped] = useState('')

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTyped(''); onCancel() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently Deactivate Client</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-destructive">This action is PERMANENT and cannot be reversed.</span>{' '}
            The client will lose all access and cannot be reactivated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Type <span className="font-semibold">{clientName}</span> to confirm</Label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={clientName}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setTyped(''); onCancel() }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={typed !== clientName || loading}
          >
            {loading ? 'Deactivating...' : 'Permanently Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] Create `ReceivePaymentModal.tsx`:

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { receivePayment } from '@/lib/api/admin/billing'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  dateReceived: z.string().min(1, 'Required'),
  referenceNumber: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  clientId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReceivePaymentModal({ open, clientId, onSuccess, onCancel }: Props) {
  const { toast } = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    await receivePayment(clientId, data)
    toast({ title: 'Payment recorded.' })
    reset()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onCancel() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input type="number" step="0.01" {...register('amount')} />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Date Received</Label>
            <Input type="date" {...register('dateReceived')} />
            {errors.dateReceived && <p className="text-xs text-red-600">{errors.dateReceived.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Reference Number</Label>
            <Input {...register('referenceNumber')} />
            {errors.referenceNumber && <p className="text-xs text-red-600">{errors.referenceNumber.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onCancel() }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/components/admin/DeactivateClientModal.tsx frontend/src/components/admin/ReceivePaymentModal.tsx
git commit -m "feat: add DeactivateClientModal and ReceivePaymentModal"
```

---

## Task 8: Admin layout

**Files:**
- Create: `frontend/src/app/(admin)/layout.tsx`

- [ ] Create the file:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('sofia_user')
    if (!raw) { router.replace('/login'); return }
    const user = JSON.parse(raw)
    if (user.role !== 'admin') router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] Run TypeScript check:

```
docker exec sofia-frontend npx tsc --noEmit
```

- [ ] Commit:

```
git add frontend/src/app/\(admin\)/layout.tsx
git commit -m "feat: add admin layout with role guard"
```

---

## Task 9: Dashboard page

**Files:**
- Create: `frontend/src/app/(admin)/dashboard/page.tsx`

- [ ] Create the file:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/lib/api/admin/dashboard'
import { AccountantWorkloadCard } from '@/components/admin/AccountantWorkloadCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>

      <Link href="/admin/queue?flag=RED">
        <Card className="max-w-xs hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-1">
            <CardTitle className="text-base text-red-700">Open RED Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-700">{data?.openRedItems ?? 0}</p>
          </CardContent>
        </Card>
      </Link>

      <div>
        <h2 className="text-base font-medium mb-3">Accountant Workload</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.accountants ?? []).map((a) => (
            <AccountantWorkloadCard key={a.id} accountant={a} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/dashboard/page.tsx
git commit -m "feat: add admin dashboard page"
```

---

## Task 10: Clients list + create pages

**Files:**
- Create: `frontend/src/app/(admin)/clients/page.tsx`
- Create: `frontend/src/app/(admin)/clients/create/page.tsx`

- [ ] Create `clients/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { ClientTable } from '@/components/admin/ClientTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Filters {
  search?: string
  status?: string
  accountantId?: string
  page?: number
}

export default function AdminClientsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', filters],
    queryFn: () => getClients(filters),
  })

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Button onClick={() => router.push('/admin/clients/create')}>Create Client</Button>
      </div>
      <ClientTable
        clients={data?.data ?? []}
        pagination={data?.pagination}
        accountants={accountants}
        onFilterChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
      />
    </div>
  )
}
```

- [ ] Create `clients/create/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

const schema = z.object({
  businessName: z.string().min(1, 'Required'),
  mobile: z.string().min(1, 'Required'),
  planType: z.enum(['starter', 'growth', 'premium']),
  birType: z.enum(['vat', 'non_vat']),
  accountantId: z.string().min(1, 'Required'),
  tin: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SuccessData {
  companyId: string
  inviteLink: string
  username: string
  email?: string
}

export default function CreateClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { planType: 'starter', birType: 'non_vat' },
  })

  const onSubmit = async (data: FormValues) => {
    const result = await createClient(data)
    setSuccess({ ...result, email: data.email || undefined })
  }

  const copyLink = () => {
    if (success) {
      navigator.clipboard.writeText(success.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (success) {
    return (
      <div className="max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="text-4xl">✓</div>
          <h1 className="text-xl font-semibold">Client created!</h1>
          <p className="text-sm text-muted-foreground">Login username: <span className="font-mono font-semibold">{success.username}</span></p>
        </div>
        <div className="border rounded-md p-3 space-y-2">
          <p className="text-sm font-medium">Invite Link</p>
          <p className="text-xs text-muted-foreground break-all">{success.inviteLink}</p>
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {success.email
            ? 'Invite email sent automatically.'
            : 'No email provided — share this link manually.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSuccess(null); setCopied(false) }}>
            Create Another Client
          </Button>
          <Button onClick={() => router.push(`/admin/clients/${success.companyId}`)}>
            View Client Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/clients">← Back</Link></Button>
        <h1 className="text-xl font-semibold">Create Client</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Business Name *</Label>
            <Input {...register('businessName')} />
            {errors.businessName && <p className="text-xs text-red-600">{errors.businessName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Mobile *</Label>
            <Input {...register('mobile')} />
            {errors.mobile && <p className="text-xs text-red-600">{errors.mobile.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>TIN</Label>
            <Input {...register('tin')} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Contact Person</Label>
            <Input {...register('contactPerson')} />
          </div>
          <div className="space-y-1">
            <Label>Plan *</Label>
            <Select value={watch('planType')} onValueChange={(v) => setValue('planType', v as 'starter' | 'growth' | 'premium')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>VAT Type *</Label>
            <Select value={watch('birType')} onValueChange={(v) => setValue('birType', v as 'vat' | 'non_vat')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="non_vat">Non-VAT</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Accountant *</Label>
            <Select value={watch('accountantId') ?? ''} onValueChange={(v) => setValue('accountantId', v)}>
              <SelectTrigger><SelectValue placeholder="Select accountant..." /></SelectTrigger>
              <SelectContent>
                {(accountants ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountantId && <p className="text-xs text-red-600">{errors.accountantId.message}</p>}
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Client'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/clients/page.tsx frontend/src/app/\(admin\)/clients/create/page.tsx
git commit -m "feat: add admin clients list and create pages"
```

---

## Task 11: Client detail page — Overview + Documents tabs

**Files:**
- Create: `frontend/src/app/(admin)/clients/[id]/page.tsx`

- [ ] Create the file (Overview + Documents tabs; COA tab added in Task 12):

```tsx
'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getClient, updateClient, suspendClient, reactivateClient,
  markClientOverdue, deactivateClient, resetClientAccess,
  getClientDocumentsAdmin, getChartOfAccounts, saveChartOfAccounts,
} from '@/lib/api/admin/clients'
import { reassignAccountant } from '@/lib/api/admin/clients'
import { ClientStatusBadge } from '@/components/admin/ClientStatusBadge'
import { AssignAccountantModal } from '@/components/admin/AssignAccountantModal'
import { SuspendClientModal } from '@/components/admin/SuspendClientModal'
import { DeactivateClientModal } from '@/components/admin/DeactivateClientModal'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import Link from 'next/link'
import type { Account } from '@/types/admin'

const infoSchema = z.object({
  name: z.string().min(1, 'Required'),
  mobile: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  tin: z.string().optional(),
})
type InfoValues = z.infer<typeof infoSchema>

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [assignOpen, setAssignOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [coaEdits, setCoaEdits] = useState<Account[] | null>(null)

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => getClient(id),
  })

  const { data: docs } = useQuery({
    queryKey: ['admin-client-docs', id],
    queryFn: () => getClientDocumentsAdmin(id),
  })

  const { data: coaData } = useQuery({
    queryKey: ['coa', id],
    queryFn: () => getChartOfAccounts(id),
    onSuccess: (data) => { if (!coaEdits) setCoaEdits(data) },
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    values: client ? {
      name: client.name,
      mobile: client.mobile,
      email: client.email ?? '',
      contactPerson: client.contactPerson ?? '',
      tin: client.tin ?? '',
    } : undefined,
  })

  const onSaveInfo = async (data: InfoValues) => {
    await updateClient(id, data)
    toast({ title: 'Changes saved.' })
    queryClient.invalidateQueries({ queryKey: ['admin-client', id] })
  }

  const onReassign = async (accountantId: string) => {
    setLoading(true)
    try {
      await reassignAccountant(id, accountantId)
      toast({ title: 'Accountant reassigned.' })
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] })
      setAssignOpen(false)
    } finally { setLoading(false) }
  }

  const onSuspend = async () => {
    setLoading(true)
    try {
      if (client?.clientStatus === 'SUSPENDED') {
        await reactivateClient(id)
        toast({ title: 'Client reactivated.' })
      } else {
        await suspendClient(id)
        toast({ title: 'Client suspended.' })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] })
      setSuspendOpen(false)
    } finally { setLoading(false) }
  }

  const onDeactivate = async () => {
    setLoading(true)
    try {
      await deactivateClient(id)
      toast({ title: 'Client deactivated.' })
      router.push('/admin/clients')
    } finally { setLoading(false) }
  }

  const onOverdue = async () => {
    setLoading(true)
    try {
      await markClientOverdue(id)
      toast({ title: 'Client marked as overdue.' })
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] })
    } finally { setLoading(false) }
  }

  const onResetAccess = async () => {
    setLoading(true)
    try {
      const { inviteLink } = await resetClientAccess(id)
      setResetLink(inviteLink)
    } finally { setLoading(false) }
  }

  const onSaveCoa = async () => {
    if (!coaEdits) return
    setLoading(true)
    try {
      await saveChartOfAccounts(id, coaEdits)
      toast({ title: 'Chart of accounts saved.' })
      queryClient.invalidateQueries({ queryKey: ['coa', id] })
    } catch {
      toast({ title: 'Could not save — an account may have existing journal lines.', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  if (isLoading || !client) return <Skeleton className="h-96 w-full" />

  const coa = coaEdits ?? coaData ?? []
  const grouped = {
    income:  coa.filter((a) => a.type === 'income'),
    expense: coa.filter((a) => a.type === 'expense'),
    cash:    coa.filter((a) => a.type === 'cash'),
    vat:     coa.filter((a) => a.type === 'vat'),
  }

  const updateCoaRow = (accountId: string, patch: Partial<Account>) => {
    setCoaEdits((prev) =>
      (prev ?? coa).map((a) => a.id === accountId ? { ...a, ...patch } : a)
    )
  }

  const addCoaRow = (type: 'income' | 'expense') => {
    const newRow: Account = { id: `new-${Date.now()}`, code: '', name: '', type, isSystemManaged: false, isActive: true }
    setCoaEdits((prev) => [...(prev ?? coa), newRow])
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/clients">← Back</Link></Button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">{client.name}</h1>
        <ClientStatusBadge status={client.clientStatus} />
        <span className="text-sm text-muted-foreground">@{client.username}</span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <form onSubmit={handleSubmit(onSaveInfo)} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label>Business Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input {...register('mobile')} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
              </div>
              <div className="space-y-1">
                <Label>Contact Person</Label>
                <Input {...register('contactPerson')} />
              </div>
              <div className="space-y-1">
                <Label>TIN</Label>
                <Input {...register('tin')} />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Username (read-only)</Label>
                <p className="text-sm font-mono">{client.username}</p>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>Save Changes</Button>
          </form>

          <div className="space-y-2">
            <p className="text-sm font-medium">Assigned Accountant</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">{client.accountantName}</span>
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Reassign</Button>
            </div>
          </div>

          {client.lastPayment && (
            <div className="text-sm text-muted-foreground">
              Last payment: {formatCurrency(client.lastPayment.amount)} on {formatDate(client.lastPayment.dateReceived)}
            </div>
          )}
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>Receive Payment</Button>

          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {(client.clientStatus === 'ACTIVE' || client.clientStatus === 'OVERDUE') && (
                <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)} disabled={loading}>
                  Suspend
                </Button>
              )}
              {client.clientStatus === 'SUSPENDED' && (
                <Button size="sm" onClick={() => setSuspendOpen(true)} disabled={loading}>Reactivate</Button>
              )}
              {client.clientStatus === 'ACTIVE' && (
                <Button variant="outline" size="sm" onClick={onOverdue} disabled={loading}>Mark as Overdue</Button>
              )}
              {client.clientStatus !== 'INACTIVE' && (
                <Button variant="destructive" size="sm" onClick={() => setDeactivateOpen(true)} disabled={loading}>
                  Deactivate
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onResetAccess} disabled={loading}>Reset Access</Button>
            </div>
            {resetLink && (
              <div className="border rounded-md p-2 space-y-1 text-sm">
                <p className="font-medium">New invite link:</p>
                <p className="text-xs break-all text-muted-foreground">{resetLink}</p>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(resetLink) }}>Copy</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── DOCUMENTS ── */}
        <TabsContent value="documents" className="pt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(docs ?? []).map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </TabsContent>

        {/* ── CHART OF ACCOUNTS ── */}
        <TabsContent value="coa" className="space-y-6 pt-4">
          {(['income', 'expense'] as const).map((type) => (
            <div key={type} className="space-y-2">
              <p className="text-sm font-medium capitalize">{type} Accounts</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[type].filter((a) => a.isActive).map((account) => (
                      <tr key={account.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{account.code}</td>
                        <td className="px-3 py-2">
                          <Input
                            className="h-7 text-sm"
                            value={account.name}
                            onChange={(e) => updateCoaRow(account.id, { name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="text-muted-foreground hover:text-destructive text-xs"
                            onClick={() => updateCoaRow(account.id, { isActive: false })}
                            title="Remove account"
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="outline" onClick={() => addCoaRow(type)}>+ Add Account</Button>
            </div>
          ))}

          {(['cash', 'vat'] as const).map((type) => (
            <div key={type} className="space-y-2">
              <p className="text-sm font-medium capitalize">{type} Accounts <span className="text-xs text-muted-foreground">(system-managed)</span></p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {grouped[type].map((account) => (
                      <tr key={account.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground w-24">{account.code}</td>
                        <td className="px-3 py-2">{account.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <Button onClick={onSaveCoa} disabled={loading}>Save Chart of Accounts</Button>
        </TabsContent>
      </Tabs>

      <AssignAccountantModal
        open={assignOpen}
        clientId={id}
        currentAccountantId={client.accountantId}
        onConfirm={onReassign}
        onCancel={() => setAssignOpen(false)}
      />
      <SuspendClientModal
        open={suspendOpen}
        clientName={client.name}
        isSuspended={client.clientStatus === 'SUSPENDED'}
        onConfirm={onSuspend}
        onCancel={() => setSuspendOpen(false)}
        loading={loading}
      />
      <DeactivateClientModal
        open={deactivateOpen}
        clientName={client.name}
        onConfirm={onDeactivate}
        onCancel={() => setDeactivateOpen(false)}
        loading={loading}
      />
      <ReceivePaymentModal
        open={paymentOpen}
        clientId={id}
        onSuccess={() => { setPaymentOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-client', id] }) }}
        onCancel={() => setPaymentOpen(false)}
      />
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/clients/\[id\]/page.tsx
git commit -m "feat: add admin client detail page"
```

---

## Task 12: Client edit page

**Files:**
- Create: `frontend/src/app/(admin)/clients/[id]/edit/page.tsx`

- [ ] Create the file:

```tsx
'use client'

import { use, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getClient, updatePlan } from '@/lib/api/admin/clients'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

const schema = z.object({
  planType: z.enum(['starter', 'growth', 'premium']),
  birType: z.enum(['vat', 'non_vat']),
})
type FormValues = z.infer<typeof schema>

export default function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [warning, setWarning] = useState<string | null>(null)

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => getClient(id),
  })

  const { watch, setValue, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: client ? { planType: client.plan as 'starter' | 'growth' | 'premium', birType: client.birType } : undefined,
  })

  const onSubmit = async (data: FormValues) => {
    const result = await updatePlan(id, data)
    if (result.warning) setWarning(result.warning)
    toast({ title: 'Plan updated.' })
    router.push(`/admin/clients/${id}`)
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="max-w-sm space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href={`/admin/clients/${id}`}>← Back</Link></Button>
      <h1 className="text-xl font-semibold">Edit Plan</h1>
      {warning && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
          Existing entries retain their original VAT treatment. Only future transactions will use the new type.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label>Plan</Label>
          <Select value={watch('planType')} onValueChange={(v) => setValue('planType', v as 'starter' | 'growth' | 'premium')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>VAT Type</Label>
          <Select value={watch('birType')} onValueChange={(v) => setValue('birType', v as 'vat' | 'non_vat')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="non_vat">Non-VAT</SelectItem>
              <SelectItem value="vat">VAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isSubmitting}>Save</Button>
      </form>
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/clients/\[id\]/edit/page.tsx
git commit -m "feat: add client plan edit page"
```

---

## Task 13: Accountants list, create, and detail pages

**Files:**
- Create: `frontend/src/app/(admin)/accountants/page.tsx`
- Create: `frontend/src/app/(admin)/accountants/create/page.tsx`
- Create: `frontend/src/app/(admin)/accountants/[id]/page.tsx`

- [ ] Create `accountants/page.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getAccountants } from '@/lib/api/admin/accountants'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

export default function AdminAccountantsPage() {
  const router = useRouter()
  const { data, isLoading } = useQuery({ queryKey: ['accountants'], queryFn: getAccountants })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Accountants</h1>
        <Button onClick={() => router.push('/admin/accountants/create')}>Create Accountant</Button>
      </div>
      {!data?.length ? <EmptyState message="No accountants yet." /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Clients</th>
                <th className="px-3 py-2 text-left font-medium">Open RED</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr
                  key={a.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/accountants/${a.id}`)}
                >
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.email}</td>
                  <td className="px-3 py-2">{a.clientCount}</td>
                  <td className="px-3 py-2 text-red-700 font-medium">{a.redCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `accountants/create/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createAccountant } from '@/lib/api/admin/accountants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})
type FormValues = z.infer<typeof schema>

export default function CreateAccountantPage() {
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    await createAccountant(data)
    setSuccessEmail(data.email)
  }

  if (successEmail) {
    return (
      <div className="max-w-sm space-y-4">
        <p className="text-sm">Invite email sent to <span className="font-semibold">{successEmail}</span>. Accountant can now set up their account.</p>
        <Button asChild variant="outline"><Link href="/admin/accountants">Back to Accountants</Link></Button>
      </div>
    )
  }

  return (
    <div className="max-w-sm space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/accountants">← Back</Link></Button>
      <h1 className="text-xl font-semibold">Create Accountant</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label>Full Name *</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Email *</Label>
          <Input type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Accountant'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] Create `accountants/[id]/page.tsx`:

```tsx
'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getAccountant, getAccountants,
  resetAccountantPassword, deactivateAccountant,
} from '@/lib/api/admin/accountants'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function AccountantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [resetOpen, setResetOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [replacementId, setReplacementId] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: accountant, isLoading } = useQuery({
    queryKey: ['accountant', id],
    queryFn: () => getAccountant(id),
  })

  const { data: allAccountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
    enabled: deactivateOpen,
  })

  const otherAccountants = (allAccountants ?? []).filter((a) => a.id !== id)
  const hasClients = (accountant?.assignedClients?.length ?? 0) > 0

  const onResetPassword = async () => {
    setLoading(true)
    try {
      await resetAccountantPassword(id)
      toast({ title: 'Password reset email sent.' })
      setResetOpen(false)
    } finally { setLoading(false) }
  }

  const onDeactivate = async () => {
    setLoading(true)
    try {
      await deactivateAccountant(id, hasClients ? replacementId : undefined)
      toast({ title: 'Accountant deactivated.' })
      router.push('/admin/accountants')
    } finally { setLoading(false) }
  }

  if (isLoading || !accountant) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/accountants">← Back</Link></Button>
      <div>
        <h1 className="text-xl font-semibold">{accountant.name}</h1>
        <p className="text-sm text-muted-foreground">{accountant.email}</p>
        {accountant.mobile && <p className="text-sm text-muted-foreground">{accountant.mobile}</p>}
      </div>

      <div className="flex gap-3">
        <Badge variant="outline" className="bg-red-100 text-red-800">{accountant.redCount} RED</Badge>
        <span className="text-sm">{accountant.clientCount} clients</span>
        <span className="text-sm">{accountant.pendingEntries} pending entries</span>
      </div>

      {accountant.assignedClients && accountant.assignedClients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Assigned Clients</p>
          <div className="space-y-1">
            {accountant.assignedClients.map((c) => (
              <Link key={c.clientId} href={`/admin/clients/${c.clientId}`} className="block text-sm hover:underline text-primary">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setResetOpen(true)}>Reset Password</Button>
        <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>Deactivate</Button>
      </div>

      <ConfirmModal
        open={resetOpen}
        onConfirm={onResetPassword}
        onCancel={() => setResetOpen(false)}
        title="Reset Password"
        description={`Send a password reset email to ${accountant.email}?`}
        confirmLabel="Send Reset Email"
      />

      <Dialog open={deactivateOpen} onOpenChange={(o) => !o && setDeactivateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Accountant</DialogTitle>
          </DialogHeader>
          {hasClients ? (
            <div className="space-y-3 py-2">
              <p className="text-sm">
                This accountant has {accountant.assignedClients?.length} assigned clients. Select a replacement:
              </p>
              <Select value={replacementId} onValueChange={setReplacementId}>
                <SelectTrigger><SelectValue placeholder="Select replacement..." /></SelectTrigger>
                <SelectContent>
                  {otherAccountants.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm py-2">Are you sure you want to deactivate {accountant.name}?</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onDeactivate}
              disabled={loading || (hasClients && !replacementId)}
            >
              {loading ? 'Deactivating...' : 'Transfer and Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/accountants/
git commit -m "feat: add admin accountants pages"
```

---

## Task 14: Billing pages

**Files:**
- Create: `frontend/src/app/(admin)/billing/page.tsx`
- Create: `frontend/src/app/(admin)/billing/[clientId]/page.tsx`

- [ ] Create `billing/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPayments } from '@/lib/api/admin/billing'
import { getClients } from '@/lib/api/admin/clients'
import { BillingRecordRow } from '@/components/admin/BillingRecordRow'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminBillingPage() {
  const [clientId, setClientId] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [filters, setFilters] = useState<{ clientId?: string; start?: string; end?: string }>({})

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', filters],
    queryFn: () => getPayments(filters),
  })

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
  })

  const clientMap = Object.fromEntries((clientsData?.data ?? []).map((c) => [c.companyId ?? c.clientId, c.name]))

  const apply = () => setFilters({
    clientId: clientId !== 'all' ? clientId : undefined,
    start: start || undefined,
    end: end || undefined,
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Billing</h1>
      <div className="flex flex-wrap gap-2 items-end">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {(clientsData?.data ?? []).map((c) => (
              <SelectItem key={c.clientId} value={c.clientId}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-36" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" className="w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button size="sm" onClick={apply}>Filter</Button>
      </div>
      {!payments?.length ? <EmptyState message="No payments found." /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Ref No.</th>
                <th className="px-3 py-2 text-left font-medium">Client</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((r) => (
                <BillingRecordRow key={r.id} record={r} clientName={clientMap[r.companyId] ?? r.companyId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `billing/[clientId]/page.tsx`:

```tsx
'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getClientPayments } from '@/lib/api/admin/billing'
import { getClient } from '@/lib/api/admin/clients'
import { BillingRecordRow } from '@/components/admin/BillingRecordRow'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import Link from 'next/link'

export default function ClientBillingPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const queryClient = useQueryClient()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data: client } = useQuery({ queryKey: ['admin-client', clientId], queryFn: () => getClient(clientId) })
  const { data: payments, isLoading } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: () => getClientPayments(clientId),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/billing">← Back</Link></Button>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{client?.name ?? 'Client'} — Payments</h1>
        <Button onClick={() => setPaymentOpen(true)}>Receive Payment</Button>
      </div>
      {!payments?.length ? <EmptyState message="No payments recorded yet." /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Ref No.</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((r) => <BillingRecordRow key={r.id} record={r} />)}
            </tbody>
          </table>
        </div>
      )}
      <ReceivePaymentModal
        open={paymentOpen}
        clientId={clientId}
        onSuccess={() => { setPaymentOpen(false); queryClient.invalidateQueries({ queryKey: ['client-payments', clientId] }) }}
        onCancel={() => setPaymentOpen(false)}
      />
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/billing/
git commit -m "feat: add admin billing pages"
```

---

## Task 15: Queue pages

**Files:**
- Create: `frontend/src/app/(admin)/queue/page.tsx`
- Create: `frontend/src/app/(admin)/queue/[id]/page.tsx`

- [ ] Create `queue/page.tsx`:

```tsx
'use client'

import { useApprovalQueue } from '@/lib/hooks/useApprovalQueue'
import { QueueTable } from '@/components/queue/QueueTable'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'

export default function AdminQueuePage() {
  const { items, isLoading, batchApprove } = useApprovalQueue()

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
  })

  const clientOptions = (clientsData?.data ?? []).map((c) => ({ id: c.clientId, name: c.name }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Approval Queue</h1>
      <QueueTable
        items={items}
        isLoading={isLoading}
        batchApprove={batchApprove}
        clients={clientOptions}
        reviewBasePath="/admin/queue"
      />
    </div>
  )
}
```

- [ ] Create `queue/[id]/page.tsx`:

```tsx
'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQueueItem } from '@/lib/api/queue'
import { ReviewPanel } from '@/components/queue/ReviewPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminQueueReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: item, isLoading } = useQuery({
    queryKey: ['queue-item', id],
    queryFn: () => getQueueItem(id),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!item) return <p className="text-sm text-muted-foreground">Item not found.</p>

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/queue">← Back to Queue</Link></Button>
      <ReviewPanel item={item} isVat={item.isVat} backUrl="/admin/queue" />
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/queue/
git commit -m "feat: add admin queue pages"
```

---

## Task 16: Adjusting entries pages

**Files:**
- Create: `frontend/src/app/(admin)/adjusting-entries/page.tsx`
- Create: `frontend/src/app/(admin)/adjusting-entries/new/page.tsx`
- Create: `frontend/src/app/(admin)/adjusting-entries/[id]/page.tsx`

- [ ] Create `adjusting-entries/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getEntries } from '@/lib/api/adjusting-entries'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { EntryStatusBadge } from '@/components/adjusting-entries/EntryStatusBadge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/formatDate'
import type { EntryStatus } from '@/types/adjusting-entry'

export default function AdminAdjustingEntriesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string>('PENDING')
  const [clientId, setClientId] = useState('all')

  const { data: entries, isLoading } = useQuery({
    queryKey: ['adjusting-entries', { status, clientId }],
    queryFn: () => getEntries({
      status: status !== 'all' ? status : undefined,
      clientId: clientId !== 'all' ? clientId : undefined,
    }),
  })

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
  })

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
  })

  const accountantMap = Object.fromEntries((accountants ?? []).map((a) => [a.id, a.name]))

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Adjusting Entries</h1>
        <Button onClick={() => router.push('/admin/adjusting-entries/new')}>New Entry</Button>
      </div>
      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {(clientsData?.data ?? []).map((c) => (
              <SelectItem key={c.clientId} value={c.clientId}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!entries?.length ? <EmptyState message="No entries found." /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Accountant</th>
                <th className="px-3 py-2 text-left font-medium">Memo</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/adjusting-entries/${e.id}`)}
                >
                  <td className="px-3 py-2">{formatDate(e.date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{accountantMap[e.createdBy] ?? e.createdBy}</td>
                  <td className="px-3 py-2">{e.memo}</td>
                  <td className="px-3 py-2">{e.type}</td>
                  <td className="px-3 py-2"><EntryStatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `adjusting-entries/new/page.tsx`:

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { getAccounts } from '@/lib/api/accounts'
import { createEntry, submitEntry } from '@/lib/api/adjusting-entries'
import { EntryForm } from '@/components/adjusting-entries/EntryForm'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

function NewEntryContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>()

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => getAccounts(selectedCompanyId),
    enabled: !!selectedCompanyId,
  })

  const clients = (clientsData?.data ?? []).map((c) => ({ id: c.clientId, name: c.name }))

  const onSave = async (data: any, asDraft: boolean) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const selfApprove = !!data.selfApprove
    const { entryId } = await createEntry({
      companyId: data.companyId,
      date: data.date,
      memo: data.memo,
      type: data.type,
      lines: data.lines,
    })
    if (selfApprove) {
      await submitEntry(entryId, true)
      toast({ title: 'Entry approved.' })
    } else if (!asDraft) {
      await submitEntry(entryId)
      toast({ title: 'Submitted for approval.' })
    } else {
      toast({ title: 'Draft saved.' })
    }
    router.push(`/admin/adjusting-entries/${entryId}`)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">New Adjusting Entry</h1>
      <div className="space-y-1">
        <Label>Client</Label>
        <Select value={selectedCompanyId ?? ''} onValueChange={setSelectedCompanyId}>
          <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedCompanyId && (
        <EntryForm
          key={selectedCompanyId}
          companyId={selectedCompanyId}
          onSave={onSave}
          isAdmin
          accounts={accounts ?? []}
        />
      )}
    </div>
  )
}

export default function AdminNewEntryPage() {
  return (
    <Suspense>
      <NewEntryContent />
    </Suspense>
  )
}
```

- [ ] Create `adjusting-entries/[id]/page.tsx`:

```tsx
'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getEntry, updateEntry, submitEntry, approveEntry, rejectEntry,
} from '@/lib/api/adjusting-entries'
import { getAccounts } from '@/lib/api/accounts'
import { EntryForm } from '@/components/adjusting-entries/EntryForm'
import { EntryStatusBadge } from '@/components/adjusting-entries/EntryStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils/formatDate'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import Link from 'next/link'

export default function AdminEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: entry, isLoading } = useQuery({
    queryKey: ['adjusting-entry', id],
    queryFn: () => getEntry(id),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', entry?.companyId],
    queryFn: () => getAccounts(entry?.companyId),
    enabled: !!entry?.companyId && entry.status === 'DRAFT',
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!entry) return <p className="text-sm text-muted-foreground">Entry not found.</p>

  const onSave = async (data: any, asDraft: boolean) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const selfApprove = !!data.selfApprove
    setLoading(true)
    try {
      await updateEntry(id, { date: data.date, memo: data.memo, type: data.type, lines: data.lines })
      if (selfApprove) {
        await submitEntry(id, true)
        toast({ title: 'Entry approved.' })
        router.push('/admin/adjusting-entries')
      } else if (!asDraft) {
        await submitEntry(id)
        toast({ title: 'Submitted.' })
      } else {
        toast({ title: 'Draft saved.' })
      }
      queryClient.invalidateQueries({ queryKey: ['adjusting-entry', id] })
    } finally { setLoading(false) }
  }

  const onApprove = async () => {
    setLoading(true)
    try {
      await approveEntry(id)
      toast({ title: 'Entry approved.' })
      router.push('/admin/adjusting-entries')
    } finally { setLoading(false) }
  }

  const onReject = async () => {
    if (!rejectReason.trim()) return
    setLoading(true)
    try {
      await rejectEntry(id, rejectReason)
      toast({ title: 'Entry rejected.' })
      router.push('/admin/adjusting-entries')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/adjusting-entries">← Back</Link>
      </Button>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Adjusting Entry</h1>
        <EntryStatusBadge status={entry.status} />
      </div>

      {entry.status === 'DRAFT' && (
        <EntryForm initialData={entry} onSave={onSave} isAdmin accounts={accounts ?? []} />
      )}

      {entry.status === 'PENDING' && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{line.accountCode} — {line.accountName}</td>
                    <td className="px-3 py-2 text-right">{line.debit !== null ? formatCurrency(line.debit) : '—'}</td>
                    <td className="px-3 py-2 text-right">{line.credit !== null ? formatCurrency(line.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button onClick={onApprove} disabled={loading}>Approve</Button>
            <Button variant="destructive" onClick={() => setShowRejectInput(true)} disabled={loading}>Reject</Button>
          </div>
          {showRejectInput && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter reason..." />
              <Button variant="destructive" size="sm" onClick={onReject} disabled={!rejectReason.trim() || loading}>
                Confirm Rejection
              </Button>
            </div>
          )}
        </div>
      )}

      {(entry.status === 'APPROVED' || entry.status === 'REJECTED') && (
        <div className="space-y-3">
          {entry.status === 'APPROVED' && (
            <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-800">
              Approved on {entry.approvedAt ? formatDate(entry.approvedAt) : '—'}
            </div>
          )}
          {entry.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-800">
              Rejected: {entry.rejectionReason}
            </div>
          )}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{line.accountCode} — {line.accountName}</td>
                    <td className="px-3 py-2 text-right">{line.debit !== null ? formatCurrency(line.debit) : '—'}</td>
                    <td className="px-3 py-2 text-right">{line.credit !== null ? formatCurrency(line.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/adjusting-entries/
git commit -m "feat: add admin adjusting entries pages"
```

---

## Task 17: Reports pages

**Files:**
- Create: `frontend/src/app/(admin)/reports/page.tsx`
- Create: `frontend/src/app/(admin)/reports/[clientId]/income-statement/page.tsx`
- Create: `frontend/src/app/(admin)/reports/[clientId]/expense-breakdown/page.tsx`
- Create: `frontend/src/app/(admin)/reports/[clientId]/bir/[book]/page.tsx`

- [ ] Create `reports/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReportClientSelector } from '@/components/reports/ReportClientSelector'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

function defaultStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [start, setStart] = useState(defaultStart())
  const [end, setEnd] = useState(defaultEnd())
  const [birBook, setBirBook] = useState('crb')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Client</p>
        <ReportClientSelector value={clientId} onChange={setClientId} role="admin" />
      </div>
      {clientId && (
        <>
          <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => router.push(`/admin/reports/${clientId}/income-statement?start=${start}&end=${end}`)}>
              <CardHeader><CardTitle className="text-base">Income Statement</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Revenue vs expenses summary</p></CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => router.push(`/admin/reports/${clientId}/expense-breakdown?start=${start}&end=${end}`)}>
              <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Expenses by category</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">BIR Books</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Select value={birBook} onValueChange={setBirBook}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crb">Cash Receipts Book</SelectItem>
                    <SelectItem value="cdb">Cash Disbursements Book</SelectItem>
                    <SelectItem value="gj">General Journal</SelectItem>
                    <SelectItem value="gl">General Ledger</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full"
                  onClick={() => router.push(`/admin/reports/${clientId}/bir/${birBook}?start=${start}&end=${end}`)}>
                  View Book
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] Create `reports/[clientId]/income-statement/page.tsx`:

```tsx
'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { IncomeStatementTable } from '@/components/reports/IncomeStatementTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function IncomeStatementContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/reports">← Back</Link></Button>
      <h1 className="text-xl font-semibold">Income Statement</h1>
      <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
      <IncomeStatementTable clientId={clientId} start={start} end={end} />
      <ExportPDFButton type="income-statement" clientId={clientId} start={start} end={end} />
    </div>
  )
}

export default function AdminIncomeStatementPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  return <Suspense><IncomeStatementContent clientId={clientId} /></Suspense>
}
```

- [ ] Create `reports/[clientId]/expense-breakdown/page.tsx`:

```tsx
'use client'

import { Suspense, use, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExpenseBreakdownTable } from '@/components/reports/ExpenseBreakdownTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ExpenseBreakdownContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/reports">← Back</Link></Button>
      <h1 className="text-xl font-semibold">Expense Breakdown</h1>
      <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
      <ExpenseBreakdownTable clientId={clientId} start={start} end={end} />
      <ExportPDFButton type="expense-breakdown" clientId={clientId} start={start} end={end} />
    </div>
  )
}

export default function AdminExpenseBreakdownPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  return <Suspense><ExpenseBreakdownContent clientId={clientId} /></Suspense>
}
```

- [ ] Create `reports/[clientId]/bir/[book]/page.tsx`:

```tsx
'use client'

import { Suspense, use, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BIRBookTable } from '@/components/reports/BIRBookTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { useQuery } from '@tanstack/react-query'
import { getAccounts } from '@/lib/api/accounts'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function BIRBookContent({ clientId, book }: { clientId: string; book: string }) {
  const searchParams = useSearchParams()
  const [start, setStart] = useState(searchParams.get('start') ?? '')
  const [end, setEnd] = useState(searchParams.get('end') ?? '')
  const [accountId, setAccountId] = useState<string | undefined>()

  const { data: accounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn: () => getAccounts(clientId),
    enabled: book === 'gl',
  })

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/reports">← Back</Link></Button>
      <h1 className="text-xl font-semibold capitalize">{book.toUpperCase()} Book</h1>
      <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
      {book === 'gl' && accounts && accounts.length > 0 && (
        <Select value={accountId ?? accounts[0].id} onValueChange={setAccountId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <BIRBookTable book={book} clientId={clientId} start={start} end={end} accountId={accountId ?? (book === 'gl' && accounts?.[0]?.id) || undefined} />
      <ExportPDFButton type={book as any} clientId={clientId} start={start} end={end} accountId={accountId} />
    </div>
  )
}

export default function AdminBIRBookPage({ params }: { params: Promise<{ clientId: string; book: string }> }) {
  const { clientId, book } = use(params)
  return <Suspense><BIRBookContent clientId={clientId} book={book} /></Suspense>
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/reports/
git commit -m "feat: add admin reports pages"
```

---

## Task 18: Settings page

**Files:**
- Create: `frontend/src/app/(admin)/settings/page.tsx`

- [ ] Create the file:

```tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { me, updateProfile } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  mobile: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: me })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: user ? { name: user.name, email: user.email ?? '', mobile: user.mobile ?? '' } : undefined,
  })

  const onSubmit = async (data: FormValues) => {
    await updateProfile(data)
    toast({ title: 'Profile updated.' })
    queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label>Full Name</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" {...register('email')} />
        </div>
        <div className="space-y-1">
          <Label>Mobile</Label>
          <Input {...register('mobile')} />
        </div>
        <Button type="submit" disabled={isSubmitting}>Save</Button>
      </form>
    </div>
  )
}
```

- [ ] Run TypeScript check + commit:

```
docker exec sofia-frontend npx tsc --noEmit
git add frontend/src/app/\(admin\)/settings/page.tsx
git commit -m "feat: add admin settings page"
```

---

## Task 19: Final TypeScript verification

- [ ] Run full TypeScript check inside Docker:

```
docker exec sofia-frontend npx tsc --noEmit
```
Expected: zero errors

- [ ] If errors appear, fix them before marking done. Common issues to check:
  - `use(params)` requires `params: Promise<{ ... }>` type on page props
  - `onSuccess` callback in `useQuery` requires TanStack Query v4 syntax — if error, replace with a `useEffect` watching the query data
  - `ClientProfile.createdAt` may not exist on the type — if so, remove the Created column from ClientTable or use a safe fallback
  - `ExportPDFButton` `type` prop may need the BIR book string to be cast with `as any` if the type union is strict

- [ ] Commit any TypeScript fixes with:

```
git commit -m "fix: resolve TypeScript errors in admin portal"
```

---

## Self-Review

**Spec coverage check:**
- ✅ AdminSidebar (Task 2)
- ✅ ClientStatusBadge (Task 3)
- ✅ BillingRecordRow (Task 3)
- ✅ AccountantWorkloadCard (Task 4)
- ✅ ClientTable (Task 5)
- ✅ AssignAccountantModal (Task 6)
- ✅ SuspendClientModal (Task 6) — includes reactivate logic per spec
- ✅ DeactivateClientModal (Task 7) — requires typing client name
- ✅ ReceivePaymentModal (Task 7)
- ✅ Admin layout with role guard (Task 8)
- ✅ Dashboard with workload cards + RED stat (Task 9)
- ✅ Clients list with filters (Task 10)
- ✅ Create client with success screen (Task 10)
- ✅ Client detail — Overview, Documents, COA tabs (Task 11)
- ✅ Client edit — plan + VAT only with warning (Task 12)
- ✅ Accountants list, create, detail (Task 13)
- ✅ Billing overview + per-client (Task 14)
- ✅ Admin queue reusing QueueTable (Task 15)
- ✅ Admin queue review reusing ReviewPanel (Task 15)
- ✅ Adjusting entries list, new, detail (Task 16)
- ✅ Reports pages mirroring accountant structure (Task 17)
- ✅ Settings page (Task 18)
- ✅ lib/api/admin/dashboard.ts (Task 1)

**Note on `onSuccess` in useQuery:** TanStack Query v5 removed the `onSuccess` callback from `useQuery`. Task 11 uses it for COA initialization — replace with a `useEffect` watching `coaData`:
```tsx
useEffect(() => {
  if (coaData && !coaEdits) setCoaEdits(coaData)
}, [coaData]) // eslint-disable-line react-hooks/exhaustive-deps
```
This is noted in Task 19 but should be fixed directly in Task 11.

**Fix in Task 11:** Remove `onSuccess` from the COA query and add a `useEffect` instead. The plan shows the corrected pattern in Task 19 — apply it during Task 11 implementation.
