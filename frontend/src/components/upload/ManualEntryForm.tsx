'use client'

import { useState, useCallback, useRef } from 'react'
import { createManualEntry } from '@/lib/api/documents'
import { cn } from '@/lib/utils'
import type { DeclaredType } from '@/types/document'

interface Line {
  id: number
  description: string
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (documentId: string) => void
  clientId?: string
}

const today = () => new Date().toISOString().split('T')[0]

const emptyLine = (id: number): Line => ({ id, description: '', amount: '' })

export function ManualEntryForm({ open, onClose, onSuccess, clientId }: Props) {
  const [type, setType]               = useState<DeclaredType>('expense')
  const [date, setDate]               = useState(today())
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [lines, setLines]             = useState<Line[]>([emptyLine(1)])
  const nextIdRef                     = useRef(2)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filledLines = lines.filter((l) => l.description.trim() !== '' && parseFloat(l.amount) > 0)
  const total = filledLines.reduce((sum, l) => sum + parseFloat(l.amount), 0)
  const canSubmit = filledLines.length > 0 && !isSubmitting

  const fmt = (n: number) =>
    '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const isTrailing = (line: Line) =>
    line.description.trim() === '' && (line.amount === '' || parseFloat(line.amount) === 0)

  const updateLine = useCallback((id: number, field: keyof Omit<Line, 'id'>, value: string) => {
    setLines((prev) => {
      const mapped = prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      const filled = mapped.filter((l) => !isTrailing(l))
      return [...filled, emptyLine(nextIdRef.current++)]
    })
  }, [])

  const deleteLine = useCallback((id: number) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== id)
      if (filtered.length === 0) {
        return [emptyLine(nextIdRef.current++)]
      }
      const last = filtered[filtered.length - 1]
      if (!isTrailing(last)) {
        return [...filtered, emptyLine(nextIdRef.current++)]
      }
      return filtered
    })
  }, [])

  function handleClose() {
    setType('expense')
    setDate(today())
    setPaymentMethod('Cash')
    setLines([emptyLine(1)])
    nextIdRef.current = 2
    setIsSubmitting(false)
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const { documentId } = await createManualEntry({
        declaredType:  type,
        date,
        paymentMethod,
        lines: filledLines.map((l) => ({
          description: l.description.trim(),
          amount:      parseFloat(l.amount),
        })),
        clientId,
      })
      handleClose()
      onSuccess(documentId)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const isExpense = type === 'expense'
  const accentCls = isExpense ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
  const totalCls  = isExpense ? 'text-red-600' : 'text-green-600'
  const totalBg   = isExpense ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Sheet handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="text-[15px] font-bold text-gray-900">Manual Entry</div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as DeclaredType[]).map((t) => {
              const active = type === t
              const cls = t === 'expense'
                ? active ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'border-gray-200 text-gray-400'
                : active ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'border-gray-200 text-gray-400'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn('py-2 text-sm border-[1.5px] rounded-lg transition-colors', cls)}
                >
                  {t === 'expense' ? 'EXPENSE' : 'INCOME'}
                </button>
              )
            })}
          </div>

          {/* Date + Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</div>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border-[1.5px] border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-300 transition-colors"
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment</div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border-[1.5px] border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-indigo-300 transition-colors"
              >
                {['Cash', 'GCash', 'Maya', 'Bank'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lines label */}
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            {isExpense ? 'What did you spend on?' : 'What did you earn from?'}
          </div>

          {/* Line rows */}
          <div className="space-y-2">
            {lines.map((line) => {
              const trailing = isTrailing(line)
              return (
                <div key={line.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder={trailing ? 'Add another…' : 'Describe the item…'}
                    className={cn(
                      'flex-1 border-[1.5px] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-300 transition-colors',
                      trailing ? 'border-dashed border-gray-200' : 'border-gray-200'
                    )}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      'w-24 border-[1.5px] rounded-lg px-3 py-2 text-sm text-right text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-300 transition-colors',
                      trailing ? 'border-dashed border-gray-200' : 'border-gray-200'
                    )}
                  />
                  {!trailing ? (
                    <button
                      type="button"
                      onClick={() => deleteLine(line.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-base w-5 shrink-0"
                    >
                      ×
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Total */}
          {filledLines.length > 0 && (
            <div className={cn('flex justify-between items-center px-3 py-2.5 rounded-lg border', totalBg)}>
              <span className="text-xs font-semibold text-gray-700">Total</span>
              <span className={cn('text-base font-bold', totalCls)}>{fmt(total)}</span>
            </div>
          )}

          <p className="text-[11px] text-gray-400 italic">AI will assign account codes automatically.</p>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-2.5 text-sm font-bold rounded-lg text-white transition-colors',
              canSubmit ? accentCls : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Entry'}
          </button>

        </div>
      </div>
    </div>
  )
}
