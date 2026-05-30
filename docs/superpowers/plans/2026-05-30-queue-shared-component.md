# Queue Shared Component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two separate queue page implementations (admin and accountant) with a single shared `QueuePageContent` component that accepts a `showAccountant` prop to control the accountant filter and column.

**Architecture:** Create `frontend/src/components/queue/QueuePageContent.tsx` containing all queue layout logic — grouped RED/YELLOW/GREEN table, filters, GREEN pre-selection, sticky approve bar. Both page files become thin wrappers that just pass `showAccountant` and `reviewBasePath`. Delete the old `QueueTable`, `QueueItem`, `BatchApproveBar`, and `FlagBadge` components which are no longer used.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, TanStack Query (`useQuery`), Tailwind CSS. Frontend runs in Docker via `docker compose exec frontend`.

---

## File Map

| File | Action |
|---|---|
| `frontend/src/components/queue/QueuePageContent.tsx` | **Create** — shared component |
| `frontend/src/app/admin/queue/page.tsx` | **Rewrite** — thin wrapper |
| `frontend/src/app/accountant/queue/page.tsx` | **Rewrite** — thin wrapper |
| `frontend/src/components/queue/QueueTable.tsx` | **Delete** |
| `frontend/src/components/queue/QueueItem.tsx` | **Delete** |
| `frontend/src/components/queue/BatchApproveBar.tsx` | **Delete** |
| `frontend/src/components/queue/FlagBadge.tsx` | **Delete** (only used by `QueueItem`) |

---

## Task 1: Create `QueuePageContent`

**Files:**
- Create: `frontend/src/components/queue/QueuePageContent.tsx`

- [ ] **Step 1: Create the component**

  Create `frontend/src/components/queue/QueuePageContent.tsx` with this full content:

  ```tsx
  'use client'

  import { useState, useMemo, useEffect } from 'react'
  import Link from 'next/link'
  import { useQuery } from '@tanstack/react-query'
  import { useApprovalQueue } from '@/lib/hooks/useApprovalQueue'
  import { getClients } from '@/lib/api/admin/clients'
  import { getAccountantClients } from '@/lib/api/accountant/clients'
  import { getAccountants } from '@/lib/api/admin/accountants'
  import type { QueueItem } from '@/types/queue'

  interface Props {
    showAccountant?: boolean
    reviewBasePath: string
  }

  function fmtAmount(n: number | null) {
    if (n == null) return '—'
    return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function TypeBadge({ type }: { type: 'income' | 'expense' | null }) {
    if (!type) return <span className="text-[10px] text-gray-400">—</span>
    if (type === 'income') return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Income</span>
    )
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">Expense</span>
    )
  }

  function FlagCell({ item }: { item: QueueItem }) {
    const reasons = item.anomalyReasons ?? []
    if (item.flag === 'RED') return (
      <div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">⚠ RED</span>
        {reasons.length > 0 && <div className="text-[10px] text-red-500 mt-0.5">{reasons[0]}</div>}
      </div>
    )
    if (item.flag === 'YELLOW') return (
      <div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">● YEL</span>
        {reasons.length > 0 && <div className="text-[10px] text-yellow-600 mt-0.5">{reasons[0]}</div>}
      </div>
    )
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">✓ GRN</span>
  }

  export function QueuePageContent({ showAccountant = false, reviewBasePath }: Props) {
    const { items, isLoading, batchApprove } = useApprovalQueue()

    const [clientFilter, setClientFilter]         = useState('')
    const [flagFilter, setFlagFilter]             = useState('')
    const [accountantFilter, setAccountantFilter] = useState('')
    const [selected, setSelected]                 = useState<Set<string>>(new Set())
    const [approving, setApproving]               = useState(false)
    const [toast, setToast]                       = useState<string | null>(null)

    const { data: adminClientsData } = useQuery({
      queryKey: ['admin-clients'],
      queryFn: getClients,
      enabled: showAccountant,
    })
    const { data: accountantClientsData } = useQuery({
      queryKey: ['accountant-clients'],
      queryFn: getAccountantClients,
      enabled: !showAccountant,
    })
    const clients = showAccountant
      ? (adminClientsData?.data ?? [])
      : (accountantClientsData ?? [])

    const { data: accountantsData } = useQuery({
      queryKey: ['admin-accountants'],
      queryFn: getAccountants,
      enabled: showAccountant,
    })
    const accountants = accountantsData ?? []

    useEffect(() => {
      const greenIds = items.filter((i) => i.flag === 'GREEN').map((i) => i.documentId)
      setSelected(new Set(greenIds))
    }, [items])

    const showToast = (msg: string) => {
      setToast(msg)
      setTimeout(() => setToast(null), 3000)
    }

    const filtered = useMemo(() => {
      return items.filter((item) => {
        if (clientFilter && item.clientId !== clientFilter) return false
        if (flagFilter && item.flag !== flagFilter) return false
        if (accountantFilter && item.accountantName !== accountantFilter) return false
        return true
      })
    }, [items, clientFilter, flagFilter, accountantFilter])

    const redItems    = filtered.filter((i) => i.flag === 'RED')
    const yellowItems = filtered.filter((i) => i.flag === 'YELLOW')
    const greenItems  = filtered.filter((i) => i.flag === 'GREEN')

    const toggleSelect = (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const selectAllGreen = () => setSelected(new Set(greenItems.map((i) => i.documentId)))
    const deselectAll    = () => setSelected(new Set())

    const handleBatchApprove = async () => {
      if (selected.size === 0) return
      setApproving(true)
      try {
        const result = await batchApprove(Array.from(selected))
        setSelected(new Set())
        showToast(`Approved ${result.approved.length} item(s).`)
      } catch {
        showToast('Batch approval failed. Please try again.')
      } finally {
        setApproving(false)
      }
    }

    const colSpan = showAccountant ? 9 : 8

    return (
      <div>
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
            {toast}
          </div>
        )}

        <div className="mb-5">
          <div className="text-lg font-bold text-gray-900 tracking-tight">Queue</div>
          {!isLoading && (
            <div className="text-xs text-gray-400 mt-0.5">
              {filtered.length} items —{' '}
              <span className="text-red-600 font-semibold">{redItems.length} RED</span>
              {' · '}
              <span className="text-amber-500 font-semibold">{yellowItems.length} YELLOW</span>
              {' · '}
              <span className="text-green-700 font-semibold">{greenItems.length} GREEN</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white cursor-pointer w-44"
            >
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white cursor-pointer"
            >
              <option value="">All flags</option>
              <option value="RED">🔴 RED</option>
              <option value="YELLOW">🟡 YELLOW</option>
              <option value="GREEN">🟢 GREEN</option>
            </select>

            {showAccountant && (
              <select
                value={accountantFilter}
                onChange={(e) => setAccountantFilter(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white cursor-pointer w-44"
              >
                <option value="">All accountants</option>
                {accountants.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-sm text-gray-400 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-gray-400 text-center">No items in the queue.</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-9"></th>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Client</th>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Document</th>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Type</th>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Amount</th>
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Uploaded</th>
                  {showAccountant && (
                    <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Accountant</th>
                  )}
                  <th className="bg-gray-50 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">Flag</th>
                  <th className="bg-gray-50 px-3 py-2 border-b border-gray-200 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {redItems.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={colSpan} className="px-3 py-1.5 bg-red-50 border-t-2 border-red-200">
                        <span className="text-[11px] font-semibold text-red-600">⚠ RED — {redItems.length} {redItems.length === 1 ? 'item' : 'items'}</span>
                        <span className="text-[11px] text-gray-400 ml-2">Must be reviewed individually · not eligible for batch approval</span>
                      </td>
                    </tr>
                    {redItems.map((item) => (
                      <tr key={item.documentId} className="border-b border-gray-100 last:border-b-0" style={{ borderLeft: '3px solid #ef4444' }}>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{item.clientName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.refNumber ?? '—'}</td>
                        <td className="px-3 py-2"><TypeBadge type={item.declaredType} /></td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900">{fmtAmount(item.amount)}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">{fmtDate(item.date)}</td>
                        {showAccountant && <td className="px-3 py-2 text-[11px] text-gray-400">{item.accountantName ?? '—'}</td>}
                        <td className="px-3 py-2"><FlagCell item={item} /></td>
                        <td className="px-3 py-2">
                          <Link href={`${reviewBasePath}/${item.documentId}`} className="text-[11px] font-semibold px-2.5 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {yellowItems.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={colSpan} className="px-3 py-1.5 bg-yellow-50 border-t-2 border-yellow-200">
                        <span className="text-[11px] font-semibold text-yellow-600">● YELLOW — {yellowItems.length} {yellowItems.length === 1 ? 'item' : 'items'}</span>
                        <span className="text-[11px] text-gray-400 ml-2">Must be reviewed individually · not eligible for batch approval</span>
                      </td>
                    </tr>
                    {yellowItems.map((item) => (
                      <tr key={item.documentId} className="border-b border-gray-100 last:border-b-0" style={{ borderLeft: '3px solid #f59e0b' }}>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{item.clientName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.refNumber ?? '—'}</td>
                        <td className="px-3 py-2"><TypeBadge type={item.declaredType} /></td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900">{fmtAmount(item.amount)}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">{fmtDate(item.date)}</td>
                        {showAccountant && <td className="px-3 py-2 text-[11px] text-gray-400">{item.accountantName ?? '—'}</td>}
                        <td className="px-3 py-2"><FlagCell item={item} /></td>
                        <td className="px-3 py-2">
                          <Link href={`${reviewBasePath}/${item.documentId}`} className="text-[11px] font-semibold px-2.5 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {greenItems.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={colSpan} className="px-3 py-1.5 bg-green-50 border-t-2 border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-semibold text-green-700">✓ GREEN — {greenItems.length} {greenItems.length === 1 ? 'item' : 'items'}</span>
                            <span className="text-[11px] text-gray-400 ml-2">Pre-selected for batch approval</span>
                          </div>
                          <div className="flex gap-2.5 text-[11px] text-indigo-600 pr-1">
                            <button onClick={selectAllGreen} className="hover:underline">Select all</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={deselectAll} className="hover:underline">Deselect all</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {greenItems.map((item) => (
                      <tr key={item.documentId} className="border-b border-gray-100 last:border-b-0 bg-green-50/50" style={{ borderLeft: '3px solid #16a34a' }}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(item.documentId)}
                            onChange={() => toggleSelect(item.documentId)}
                            className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{item.clientName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.refNumber ?? '—'}</td>
                        <td className="px-3 py-2"><TypeBadge type={item.declaredType} /></td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900">{fmtAmount(item.amount)}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">{fmtDate(item.date)}</td>
                        {showAccountant && <td className="px-3 py-2 text-[11px] text-gray-400">{item.accountantName ?? '—'}</td>}
                        <td className="px-3 py-2"><FlagCell item={item} /></td>
                        <td className="px-3 py-2">
                          <Link href={`${reviewBasePath}/${item.documentId}`} className="text-[11px] font-semibold px-2.5 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>

        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selected.size}</span> GREEN {selected.size === 1 ? 'item' : 'items'} selected
              </span>
              <button
                onClick={handleBatchApprove}
                disabled={approving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {approving ? 'Approving…' : `Approve Selected (${selected.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  docker compose exec frontend npx tsc --noEmit
  ```

  Expected: no errors. If you see errors about missing types, check the import paths match exactly.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/components/queue/QueuePageContent.tsx
  git commit -m "feat: add QueuePageContent shared component"
  ```

---

## Task 2: Update admin queue page

**Files:**
- Modify: `frontend/src/app/admin/queue/page.tsx`

- [ ] **Step 1: Replace the file content**

  Overwrite `frontend/src/app/admin/queue/page.tsx` with:

  ```tsx
  import { QueuePageContent } from '@/components/queue/QueuePageContent'

  export default function AdminQueuePage() {
    return <QueuePageContent showAccountant reviewBasePath="/admin/queue" />
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  docker compose exec frontend npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/admin/queue/page.tsx
  git commit -m "refactor: admin queue page → thin wrapper over QueuePageContent"
  ```

---

## Task 3: Update accountant queue page

**Files:**
- Modify: `frontend/src/app/accountant/queue/page.tsx`

- [ ] **Step 1: Replace the file content**

  Overwrite `frontend/src/app/accountant/queue/page.tsx` with:

  ```tsx
  import { QueuePageContent } from '@/components/queue/QueuePageContent'

  export default function AccountantQueuePage() {
    return <QueuePageContent reviewBasePath="/accountant/queue" />
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  docker compose exec frontend npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/accountant/queue/page.tsx
  git commit -m "refactor: accountant queue page → thin wrapper over QueuePageContent"
  ```

---

## Task 4: Delete orphaned queue components

These four files are only used by each other — nothing else in the codebase imports them now that both queue pages use `QueuePageContent`.

**Files:**
- Delete: `frontend/src/components/queue/QueueTable.tsx`
- Delete: `frontend/src/components/queue/QueueItem.tsx`
- Delete: `frontend/src/components/queue/BatchApproveBar.tsx`
- Delete: `frontend/src/components/queue/FlagBadge.tsx`

- [ ] **Step 1: Delete the files**

  ```bash
  rm frontend/src/components/queue/QueueTable.tsx \
     frontend/src/components/queue/QueueItem.tsx \
     frontend/src/components/queue/BatchApproveBar.tsx \
     frontend/src/components/queue/FlagBadge.tsx
  ```

- [ ] **Step 2: Verify TypeScript compiles — no dangling imports**

  ```bash
  docker compose exec frontend npx tsc --noEmit
  ```

  Expected: no errors. If you see "Cannot find module" errors, search for remaining imports with:

  ```bash
  grep -r "QueueTable\|QueueItem\|BatchApproveBar\|FlagBadge" frontend/src --include="*.tsx" --include="*.ts"
  ```

  Fix any remaining imports before continuing.

- [ ] **Step 3: Commit**

  ```bash
  git add -A frontend/src/components/queue/
  git commit -m "chore: delete orphaned QueueTable, QueueItem, BatchApproveBar, FlagBadge components"
  ```
