'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getQueueItem, approveItem, returnItem, rejectItem, reclassifyItem } from '@/lib/api/queue'
import { getSignedUrl } from '@/lib/api/documents'
import { getAccounts } from '@/lib/api/accounts'
import type { Account } from '@/types/admin'
import type { LinePayload } from '@/lib/api/queue'
import { SubtypeCombobox } from './SubtypeCombobox'
import { useToast } from '@/hooks/use-toast'
import { localCache } from '@/lib/localCache'

interface LineState {
  id?: string
  type: 'income' | 'expense'
  accountId: string
  accountCode: string
  subtypeId: string | null
  subtypeName: string | null
  amount: string
  description: string
  date: string
}

interface Props {
  documentId: string
  onClose: () => void
  onRemoved?: (id: string) => void
}

function AccountSelect({
  value,
  accounts,
  onChange,
  disabled,
  hasError,
}: {
  value: string
  accounts: Account[]
  onChange: (accountId: string, accountCode: string) => void
  disabled?: boolean
  hasError?: boolean
}) {
  const [search, setSearch]           = useState('')
  const [open, setOpen]               = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const inputRef                      = useRef<HTMLInputElement>(null)

  const selected = accounts.find((a) => a.id === value)
  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleFocus() {
    if (disabled) return
    setOpen(true)
    setSearch('')
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={open ? search : selected ? `${selected.code} — ${selected.name}` : ''}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setSearch(e.target.value)}
        className={`w-full border rounded px-2 py-1 text-xs ${hasError ? 'border-red-400' : 'border-t-line'}`}
        placeholder="Search accounts…"
      />
      {open && filtered.length > 0 && createPortal(
        <ul
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999, pointerEvents: 'auto' }}
          className="bg-t-card border border-t-line rounded shadow-md max-h-48 overflow-y-auto text-xs"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaMode === 0 ? e.deltaY : e.deltaY * 32 }}
        >
          {filtered.map((a) => (
            <li
              key={a.id}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(a.id, a.code); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-t-surface cursor-pointer"
            >
              {a.code} — {a.name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

function LineRow({
  line,
  accounts,
  isNew,
  onChange,
  onRemove,
  disabled,
}: {
  line: LineState & { index: number }
  accounts: Account[]
  isNew: boolean
  onChange: (patch: Partial<LineState>) => void
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className={`flex gap-1.5 items-center mb-1.5 ${isNew ? 'border-l-2 border-t-primary pl-2' : ''}`}>
      <div className="w-44 shrink-0">
        <AccountSelect
          value={line.accountId}
          accounts={accounts}
          onChange={(accountId, accountCode) => onChange({ accountId, accountCode })}
          disabled={disabled}
          hasError={!line.accountId}
        />
        {!line.accountId && (
          <div className="text-[10px] text-red-500 mt-0.5">Account required</div>
        )}
      </div>
      <div className="w-40 shrink-0">
        <SubtypeCombobox
          subtypeId={line.subtypeId}
          subtypeName={line.subtypeName}
          onChange={(subtypeId, subtypeName) => onChange({ subtypeId, subtypeName })}
        />
      </div>
      <div className="relative w-24 shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-t-muted pointer-events-none">₱</span>
        <input
          type="number"
          value={line.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="0"
          disabled={disabled}
          className="border border-t-line rounded pl-5 pr-2 py-1 text-xs w-full disabled:opacity-50"
        />
      </div>
      <input
        type="date"
        value={line.date}
        onChange={(e) => onChange({ date: e.target.value })}
        disabled={disabled}
        className="border border-t-line rounded px-2 py-1 text-xs w-32 disabled:opacity-50"
      />
      <input
        type="text"
        value={line.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description"
        disabled={disabled}
        className="border border-t-line rounded px-2 py-1 text-xs flex-1 disabled:opacity-50"
      />
      <button
        onClick={onRemove}
        disabled={disabled}
        className="text-t-faint hover:text-red-500 transition-colors text-sm px-1 shrink-0 disabled:opacity-50"
        title="Remove line"
      >
        ✕
      </button>
    </div>
  )
}

export function QueueReviewModal({ documentId, onClose, onRemoved }: Props) {
  const { toast } = useToast()
  const { data: item, isLoading } = useQuery({
    queryKey: ['queue-item', documentId],
    queryFn:  () => getQueueItem(documentId),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', item?.clientId],
    queryFn:  () => getAccounts(item!.clientId),
    enabled:  !!item?.clientId,
    initialData: () => {
      if (!item?.clientId) return undefined
      return localCache.get<Account[]>(`accounts_${item.clientId}`) ?? undefined
    },
    staleTime: 24 * 60 * 60 * 1000,
  })

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!item || item.isNoReceipt) return
    let cancelled = false
    getSignedUrl(documentId)
      .then(({ url }) => { if (!cancelled) setImageUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [documentId, item?.isNoReceipt])

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen])

  const [merchantName, setMerchantName]     = useState('')
  const [date, setDate]                     = useState('')
  const [declaredType, setDeclaredType]     = useState<'income' | 'expense'>('expense')
  const [paymentMethod, setPaymentMethod]   = useState('')
  const [merchantTin, setMerchantTin]       = useState('')

  const [lines, setLines]                   = useState<LineState[]>([])
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([])

  useEffect(() => {
    if (!item) return
    setMerchantName(item.merchantName ?? '')
    setDate(item.date ?? '')
    setDeclaredType(item.declaredType ?? 'expense')
    setPaymentMethod((item.paymentMethod ?? '').toLowerCase())
    setMerchantTin(item.merchantTin ?? '')
    setLines(
      item.transactionLines.map((l) => ({
        id:          l.id,
        type:        l.type,
        accountId:   l.accountId ?? '',
        accountCode: l.accountCode ?? '',
        subtypeId:   l.subtypeId ?? null,
        subtypeName: l.subtypeName ?? null,
        amount:      String(l.amount ?? ''),
        description: l.description ?? '',
        date:        l.date ?? '',
      }))
    )
  }, [item])

  const [footerMode, setFooterMode]       = useState<'default' | 'reject' | 'return'>('default')
  const [rejectReason, setRejectReason]   = useState('')
  const [returnNote, setReturnNote]       = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [reclassifying, setReclassifying] = useState(false)

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index: number) {
    const line = lines[index]
    if (line.id) setRemovedLineIds((prev) => prev.includes(line.id!) ? prev : [...prev, line.id!])
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function addLine(type: 'income' | 'expense') {
    setLines((prev) => [
      ...prev,
      { type, accountId: '', accountCode: '', subtypeId: null, subtypeName: null, amount: '', description: '', date: '' },
    ])
  }

  const handleApprove = async () => {
    if (!item) return
    setSubmitting(true)
    try {
      const linePayloads: LinePayload[] = lines
        .filter((l) => l.type === declaredType)
        .map((l) => ({
          id:          l.id,
          type:        l.type,
          accountId:   l.accountId || null,
          accountCode: l.accountCode || null,
          subtypeId:   l.subtypeId || null,
          amount:      parseFloat(l.amount) || 0,
          description: l.description || null,
          date:        l.date || null,
        }))

      await approveItem(documentId, {
        fields: {
          merchantName:  merchantName || null,
          date:          date || null,
          declaredType,
          paymentMethod: paymentMethod || null,
          merchantTin:   declaredType === 'expense' ? (merchantTin || null) : undefined,
        },
        lines:          linePayloads,
        removedLineIds: removedLineIds,
      })

      toast({ title: 'Document approved.' })
      setTimeout(() => onRemoved ? onRemoved(documentId) : onClose(), 500)
    } catch {
      toast({ title: 'Approval failed. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setSubmitting(true)
    try {
      await rejectItem(documentId, rejectReason)
      toast({ title: 'Document rejected.' })
      setTimeout(() => onRemoved ? onRemoved(documentId) : onClose(), 500)
    } catch {
      toast({ title: 'Rejection failed. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReclassify = async () => {
    setReclassifying(true)
    try {
      await reclassifyItem(documentId)
      toast({ title: 'Reclassifying… reopen this item once the AI finishes.' })
      onClose()
    } catch {
      toast({ title: 'Failed to queue reclassification. Please try again.', variant: 'destructive' })
    } finally {
      setReclassifying(false)
    }
  }

  const handleReturn = async () => {
    if (!returnNote.trim()) return
    setSubmitting(true)
    try {
      await returnItem(documentId, returnNote)
      toast({ title: 'Document returned for re-upload.' })
      setTimeout(() => onRemoved ? onRemoved(documentId) : onClose(), 500)
    } catch {
      toast({ title: 'Return failed. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const accountTypeOf  = (line: LineState): string | undefined =>
    accounts.find((a) => a.id === line.accountId)?.type

  const visibleLines   = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === declaredType)
  // VAT (input/output) is cash — paid or received with the invoice — so it belongs in primary.
  // Only liability (EWT Payable) and tax_credit (EWT Withheld by Buyer) reduce actual cash flow.
  const primaryLines      = visibleLines.filter((l) => { const t = accountTypeOf(l); return !t || t === 'expense' || t === 'income' || t === 'vat' })
  const counterLines      = visibleLines.filter((l) => { const t = accountTypeOf(l); return t === 'liability' || t === 'tax_credit' })

  const primaryTotal      = primaryLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const withholdingsTotal = counterLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const netCash           = primaryTotal - withholdingsTotal

  function fmtPeso(n: number) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function aiHint(current: string, original: string | null | undefined) {
    if (!original || current === original) return null
    return <div className="text-[10px] text-amber-500 mt-0.5">AI: {original}</div>
  }

  const flagCls: Record<string, string> = {
    RED:    'bg-red-100 text-red-700',
    YELLOW: 'bg-yellow-100 text-yellow-700',
    GREEN:  'bg-green-100 text-green-700',
  }

  const incomeAccounts  = accounts.filter((a) => a.type === 'income'  || a.type === 'vat' || a.type === 'liability' || a.type === 'tax_credit')
  const expenseAccounts = accounts.filter((a) => a.type === 'expense' || a.type === 'vat' || a.type === 'liability' || a.type === 'tax_credit')

  const hasEmptyAccount = lines.some((l) => !l.accountId)

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:max-w-7xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogTitle className="sr-only">Review Document</DialogTitle>

          {/* Header */}
          <div className="px-6 pt-5 pb-4 pr-10 border-b border-t-line shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-t-ink">
                {item?.refNumber ?? `#${documentId.slice(0, 8)}`}
              </div>
              <div className="text-[11px] text-t-muted mt-0.5">{item?.clientName}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReclassify}
                disabled={reclassifying || submitting || isLoading}
                className="bg-violet-50 border border-violet-300 text-violet-700 hover:bg-violet-100 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {reclassifying ? 'Queuing…' : '↻ Re-run AI'}
              </button>
              {item?.flag && (
                <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${flagCls[item.flag] ?? ''}`}>
                  {item.flag}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-t-faint p-8">Loading…</div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

              {/* TOP: receipt (left) | document fields (right) */}
              <div className="grid grid-cols-2 divide-x divide-t-line border-b border-t-line">

                {/* Left: receipt */}
                <div className="p-5 overflow-y-auto max-h-[350px]">
                {item?.isNoReceipt ? (
                  <div className="bg-t-surface border border-dashed border-t-line rounded-lg py-10 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-[11px] text-t-faint">Manual Entry — no receipt</div>
                  </div>
                ) : imageUrl ? (
                  <div
                    data-testid="receipt-viewer"
                    role="button"
                    tabIndex={0}
                    className="relative group w-full rounded-lg border border-t-line overflow-hidden cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setLightboxOpen(true)
                      }
                    }}
                  >
                    <img src={imageUrl} alt="Receipt" className="w-full object-contain block" />
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(26,15,46,0.42)] backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-[180ms]">
                      <button
                        className="w-11 h-11 rounded-xl bg-white/[0.18] border border-white/[0.32] text-white flex items-center justify-center pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-t-surface rounded-lg h-48 flex items-center justify-center border border-t-line">
                    <div className="text-3xl">🧾</div>
                  </div>
                )}
                </div>

                {/* Right: document fields */}
                <div className="p-5 overflow-y-auto space-y-3">
                  <div className="text-[10px] font-bold text-t-faint uppercase tracking-wide">Document Fields</div>

                  <div>
                    <label className="block text-[11px] text-t-muted mb-1">Merchant Name</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink"
                    />
                    {aiHint(merchantName, item?.merchantName)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-t-muted mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value)
                        setLines((prev) => prev.map((l) => ({ ...l, date: e.target.value })))
                      }}
                      className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink"
                    />
                    {aiHint(date, item?.date)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-t-muted mb-1">Declared Type</label>
                    <select
                      value={declaredType}
                      onChange={(e) => setDeclaredType(e.target.value as 'income' | 'expense')}
                      className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    {aiHint(declaredType, item?.declaredType ?? undefined)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-t-muted mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card"
                    >
                      <option value="">— Select —</option>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank">Bank</option>
                      <option value="check">Check</option>
                    </select>
                    {aiHint(paymentMethod, item?.paymentMethod ?? 'cash')}
                  </div>

                  {declaredType === 'expense' && (
                    <div>
                      <label className="block text-[11px] text-t-muted mb-1">Merchant TIN</label>
                      <input
                        type="text"
                        value={merchantTin}
                        onChange={(e) => setMerchantTin(e.target.value)}
                        placeholder="e.g. 123-456-789-000"
                        className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink"
                      />
                    </div>
                  )}

                  {item?.note && (
                    <div>
                      <label className="block text-[11px] text-t-muted mb-1">Client Notes</label>
                      <textarea
                        value={item.note}
                        disabled
                        rows={3}
                        className="w-full border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-muted bg-t-surface resize-none cursor-default"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM: transaction lines + anomalies */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">

                <div className="text-[10px] font-bold text-t-faint uppercase tracking-wide">Transaction Lines</div>

                {/* Income */}
                {declaredType === 'income' && (
                <div data-testid="income-lines-section">
                  <div className="text-xs font-semibold text-green-700 mb-1">Income</div>
                  <div className="flex gap-1.5 items-center mb-1">
                    <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
                    <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
                    <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
                    <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
                    <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
                    <div className="w-6 shrink-0" />
                  </div>
                  {primaryLines.length === 0 && (
                    <div className="text-[11px] text-t-faint mb-2">No income lines.</div>
                  )}
                  {primaryLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={incomeAccounts}
                      isNew={!l.id}
                      onChange={(patch) => updateLine(l.index, patch)}
                      onRemove={() => removeLine(l.index)}
                      disabled={submitting}
                    />
                  ))}
                  <button
                    onClick={() => addLine('income')}
                    className="text-[11px] text-t-primary hover:underline mt-1"
                  >
                    + Add income line
                  </button>
                </div>
                )}

                {/* Expense */}
                {declaredType === 'expense' && (
                <div data-testid="expense-lines-section">
                  <div className="text-xs font-semibold text-red-700 mb-1">Expense</div>
                  <div className="flex gap-1.5 items-center mb-1">
                    <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
                    <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
                    <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
                    <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
                    <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
                    <div className="w-6 shrink-0" />
                  </div>
                  {primaryLines.length === 0 && (
                    <div className="text-[11px] text-t-faint mb-2">No expense lines.</div>
                  )}
                  {primaryLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={expenseAccounts}
                      isNew={!l.id}
                      onChange={(patch) => updateLine(l.index, patch)}
                      onRemove={() => removeLine(l.index)}
                      disabled={submitting}
                    />
                  ))}
                  <button
                    onClick={() => addLine('expense')}
                    className="text-[11px] text-t-primary hover:underline mt-1"
                  >
                    + Add expense line
                  </button>
                </div>
                )}

                {/* Withholdings & Payables / Receivables — only shown when counter lines exist */}
                {counterLines.length > 0 && (
                  <div data-testid="counter-lines-section" className="mt-3">
                    <div className="text-xs font-semibold text-amber-700 mb-1">
                      {declaredType === 'expense' ? 'Withholdings & Payables' : 'Withholdings & Receivables'}{' '}
                      <span className="text-[10px] text-t-faint font-normal">
                        · reduces Net Cash {declaredType === 'expense' ? 'Out' : 'In'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-center mb-1">
                      <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
                      <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
                      <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
                      <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
                      <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
                      <div className="w-6 shrink-0" />
                    </div>
                    {counterLines.map((l) => (
                      <div key={l.id ?? `counter-${l.index}`} className="bg-t-surface rounded mb-1">
                        <LineRow
                          line={l}
                          accounts={declaredType === 'expense' ? expenseAccounts : incomeAccounts}
                          isNew={!l.id}
                          onChange={(patch) => updateLine(l.index, patch)}
                          onRemove={() => removeLine(l.index)}
                          disabled={submitting}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add deduction line — always accessible regardless of whether counter section is visible */}
                <button
                  onClick={() => addLine(declaredType)}
                  className="text-[11px] text-t-primary hover:underline mt-2"
                >
                  + Add {declaredType === 'expense' ? 'withholding / payable' : 'withholding / receivable'} line
                </button>

                {/* Cash Summary */}
                {primaryLines.length > 0 && (
                  <div
                    data-testid="cash-summary"
                    className="mt-4 border border-t-line rounded-lg p-4 bg-t-card-alt text-xs space-y-1.5"
                  >
                    <div className="flex justify-between">
                      <span className="text-t-muted">Invoice Total (incl. VAT)</span>
                      <span className="font-semibold text-t-ink tabular-nums">{fmtPeso(primaryTotal)}</span>
                    </div>
                    {withholdingsTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-t-muted">
                          − {declaredType === 'expense' ? 'EWT Payable (withheld)' : 'EWT Withheld by Buyer'}
                        </span>
                        <span className="font-semibold text-t-ink tabular-nums">({fmtPeso(withholdingsTotal)})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t-2 border-t-line pt-1.5">
                      <span data-testid="net-cash-label" className="font-bold text-t-ink">
                        {declaredType === 'expense' ? 'Net Cash Out' : 'Net Cash In'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span data-testid="net-cash-value" className="font-bold text-t-ink tabular-nums">
                          {fmtPeso(netCash)}
                        </span>
                        {paymentMethod && (
                          <span className="text-[10px] text-t-faint bg-t-card border border-t-line rounded px-1.5 py-0.5 capitalize">
                            {paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Anomaly reasons */}
                {item?.anomalyReasons && item.anomalyReasons.length > 0 && (
                  <div className="border-t border-t-line pt-4">
                    <div className="text-[10px] font-bold text-t-faint uppercase tracking-wide mb-2">
                      Anomaly Reasons
                    </div>
                    <ul className="space-y-1">
                      {item.anomalyReasons.map((r, i) => (
                        <li key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                          · {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-t-line px-6 py-3 shrink-0">
            {footerMode === 'default' && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFooterMode('reject')}
                  className="border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Reject
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFooterMode('return')}
                    className="border border-amber-400 text-amber-600 hover:bg-amber-50 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Return for Re-upload
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submitting || hasEmptyAccount}
                    className="bg-t-primary hover:bg-t-primary-deep text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>
            )}

            {footerMode === 'reject' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-t-ink">Reason for rejection</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-xs resize-none"
                  placeholder="Enter rejection reason…"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setFooterMode('default'); setRejectReason('') }}
                    className="text-xs text-t-muted hover:text-t-ink px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || submitting}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}

            {footerMode === 'return' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-t-ink">Note for client</div>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={2}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-xs resize-none"
                  placeholder="Explain what needs to be corrected…"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setFooterMode('default'); setReturnNote('') }}
                    className="text-xs text-t-muted hover:text-t-ink px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturn}
                    disabled={!returnNote.trim() || submitting}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Returning…' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </DialogContent>

        {lightboxOpen && imageUrl && (
          <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) setLightboxOpen(false) }}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-[rgba(10,8,18,0.82)] backdrop-blur-[8px]" />
              <DialogPrimitive.Content
                data-testid="receipt-lightbox"
                className="fixed inset-0 z-[401] flex items-center justify-center outline-none"
              >
                <DialogPrimitive.Title className="sr-only">Receipt image</DialogPrimitive.Title>
                <button
                  className="absolute top-5 right-6 w-10 h-10 rounded-[11px] bg-white/[0.12] border border-white/[0.2] text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors cursor-pointer"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close lightbox"
                >
                  ✕
                </button>
                <img
                  src={imageUrl}
                  alt="Receipt full view"
                  className="max-w-[min(800px,92vw)] max-h-[90vh] object-contain rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
                />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </Dialog>
    </>
  )
}
