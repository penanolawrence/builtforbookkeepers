// frontend/src/components/adjusting-entries/EntryForm.tsx
'use client'

import { useForm, useFieldArray, type Control, type FieldValues, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EntryLineRow } from './EntryLineRow'
import { BalanceIndicator } from './BalanceIndicator'
import { useToast } from '@/hooks/use-toast'
import type { AdjustingEntry, EntryType } from '@/types/adjusting-entry'
import type { Account } from '@/types/admin'

const lineSchema = z.object({
  accountId:   z.string().min(1, 'Required'),
  subtypeId:   z.string().nullable().default(null),
  subtypeName: z.string().nullable().default(null),
  debit:       z.number().nullable(),
  credit:      z.number().nullable(),
  description: z.string().nullable().default(null),
})

const schema = z.object({
  companyId: z.string().min(1, 'Required'),
  date:      z.string().min(1, 'Required'),
  memo:      z.string().min(1, 'Required').max(1000),
  type:      z.enum(['Reclassification', 'Reversal', 'Other'] as const),
  lines:     z.array(lineSchema).min(2, 'At least 2 lines required'),
})

type FormValues = z.infer<typeof schema>

const emptyLine = () => ({
  accountId: '', subtypeId: null, subtypeName: null,
  debit: null, credit: null, description: null,
})

interface Props {
  companyId?: string
  initialData?: AdjustingEntry
  onSave: (data: FormValues) => Promise<void>
  onCancel?: () => void
  accounts: Account[]
  clients?: { id: string; name: string }[]
  readOnly?: boolean
}

export function EntryForm({ companyId, initialData, onSave, onCancel, accounts, clients, readOnly = false }: Props) {
  const { toast } = useToast()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: initialData
      ? {
          companyId: initialData.companyId,
          date:      initialData.date,
          memo:      initialData.memo,
          type:      initialData.type,
          lines:     initialData.lines.map((l) => ({
            accountId:   l.accountId ?? '',
            subtypeId:   l.subtypeId ?? null,
            subtypeName: l.subtypeName ?? null,
            debit:       l.debit,
            credit:      l.credit,
            description: l.description ?? null,
          })),
        }
      : {
          companyId: companyId ?? '',
          date:      new Date().toISOString().split('T')[0],
          memo:      '',
          type:      'Reclassification',
          lines:     [emptyLine(), emptyLine()],
        },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watchedLines = watch('lines')

  const checkBalance = (): boolean => {
    const totalDebits  = watchedLines.reduce((s, l) => s + (l.debit ?? 0), 0)
    const totalCredits = watchedLines.reduce((s, l) => s + (l.credit ?? 0), 0)
    return Math.abs(totalDebits - totalCredits) < 0.01
  }

  const submit = async (values: FormValues) => {
    if (!checkBalance()) {
      toast({ title: 'Entry is not balanced. Total debits must equal total credits.', variant: 'destructive' })
      return
    }
    await onSave(values)
  }

  const companyIdLocked = !!initialData || !!companyId
  const inputCls        = `w-full border border-t-line rounded px-2 py-1.5 text-sm${readOnly ? ' bg-t-surface text-t-muted pointer-events-none' : ''}`
  const labelCls        = 'text-xs text-t-muted font-medium mb-0.5 block'
  const sectionHdrCls   = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-3'

  const selectedClient = clients?.find((c) => c.id === watch('companyId'))

  return (
    <div className="space-y-3">
      {/* Entry details card */}
      <div className="bg-t-card border border-t-line rounded-lg p-4">
        <p className={sectionHdrCls}>Entry Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className={labelCls}>Client</label>
            {companyIdLocked ? (
              <>
                <input type="hidden" {...register('companyId')} />
                <input
                  disabled
                  value={selectedClient?.name ?? watch('companyId')}
                  className={`${inputCls} bg-t-surface text-t-muted`}
                  readOnly
                />
              </>
            ) : clients && clients.length > 0 ? (
              <select
                value={watch('companyId')}
                onChange={(e) => setValue('companyId', e.target.value)}
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input {...register('companyId')} placeholder="Company ID" className={inputCls} />
            )}
            {errors.companyId && <p className="text-xs text-red-500 mt-0.5">{errors.companyId.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input type="date" {...register('date')} className={inputCls} />
            {errors.date && <p className="text-xs text-red-500 mt-0.5">{errors.date.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select
              value={watch('type')}
              onChange={(e) => setValue('type', e.target.value as EntryType)}
              className={inputCls}
            >
              <option value="Reclassification">Reclassification</option>
              <option value="Reversal">Reversal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Memo</label>
            <textarea {...register('memo')} rows={3} className={`${inputCls} resize-none`} />
            {errors.memo && <p className="text-xs text-red-500 mt-0.5">{errors.memo.message}</p>}
          </div>
        </div>
      </div>

      {/* Journal lines card */}
      <div className="bg-t-card border border-t-line rounded-lg p-4">
        <p className={sectionHdrCls}>Journal Lines</p>
        <div className="flex gap-1.5 mb-1.5 text-[10px] text-t-faint font-semibold uppercase tracking-wide">
          <span className="w-64 shrink-0">Account</span>
          <span className="w-40 shrink-0">Subtype</span>
          <span className="w-[148px] shrink-0">Dr / Cr · Amount</span>
          <span className="flex-1">Description</span>
        </div>
        <div className="space-y-1.5">
          {fields.map((field, index) => (
            <EntryLineRow
              key={field.id}
              index={index}
              control={control as unknown as Control<FieldValues>}
              remove={() => remove(index)}
              accounts={accounts}
            />
          ))}
        </div>
        {errors.lines && <p className="text-xs text-red-500 mt-1">{errors.lines.message as string}</p>}
        {!readOnly && (
          <button
            type="button"
            onClick={() => append(emptyLine())}
            className="text-xs text-t-primary font-semibold hover:text-t-primary-deep mt-2"
          >
            + Add Line
          </button>
        )}
      </div>

      <BalanceIndicator lines={watchedLines} />

      {!readOnly && (
        <div className="flex gap-2 flex-wrap justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="border border-t-line text-t-ink text-xs font-semibold px-4 py-2 rounded-md hover:bg-t-surface transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting || !checkBalance() || watchedLines.every((l) => !l.debit && !l.credit)}
            onClick={handleSubmit((v) => submit(v))}
            className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Approve only
          </button>
        </div>
      )}
    </div>
  )
}
