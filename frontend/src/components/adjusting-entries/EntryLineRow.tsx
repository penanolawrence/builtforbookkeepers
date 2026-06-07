// frontend/src/components/adjusting-entries/EntryLineRow.tsx
'use client'

import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { SubtypeCombobox } from '@/components/queue/SubtypeCombobox'
import type { Account } from '@/types/admin'

interface Props {
  index: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any, any>
  remove: () => void
  accounts: Account[]
}

export function EntryLineRow({ index, control, remove, accounts }: Props) {
  const activeBtn   = 'bg-t-primary text-white rounded px-2 py-1 text-xs font-semibold'
  const inactiveBtn = 'border border-t-line text-t-muted rounded px-2 py-1 text-xs'

  return (
    <div className="flex gap-1.5 items-start">
      <div className="w-64 shrink-0">
        <Controller
          control={control}
          name={`lines.${index}.accountId`}
          render={({ field }) => (
            <select
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full border border-t-line rounded px-2 py-1 text-xs"
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          )}
        />
      </div>

      <div className="w-40 shrink-0">
        <Controller
          control={control}
          name={`lines.${index}.subtypeId`}
          render={({ field: sidField }) => (
            <Controller
              control={control}
              name={`lines.${index}.subtypeName`}
              render={({ field: snField }) => (
                <SubtypeCombobox
                  subtypeId={sidField.value}
                  subtypeName={snField.value}
                  onChange={(id, name) => { sidField.onChange(id); snField.onChange(name) }}
                />
              )}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name={`lines.${index}.debit`}
        render={({ field: debitField }) => (
          <Controller
            control={control}
            name={`lines.${index}.credit`}
            render={({ field: creditField }) => {
              const isDebit  = debitField.value !== null && debitField.value !== undefined
              const isCredit = creditField.value !== null && creditField.value !== undefined
              return (
                <>
                  <button
                    type="button"
                    className={isDebit ? activeBtn : inactiveBtn}
                    onClick={() => {
                      if (!isDebit) {
                        debitField.onChange(0)
                        creditField.onChange(null)
                      }
                    }}
                  >
                    Dr
                  </button>
                  <button
                    type="button"
                    className={isCredit ? activeBtn : inactiveBtn}
                    onClick={() => {
                      if (!isCredit) {
                        creditField.onChange(0)
                        debitField.onChange(null)
                      }
                    }}
                  >
                    Cr
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-20 border border-t-line rounded px-2 py-1 text-xs"
                    value={isDebit ? (debitField.value ?? '') : isCredit ? (creditField.value ?? '') : ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : parseFloat(e.target.value)
                      if (isDebit) debitField.onChange(v)
                      else if (isCredit) creditField.onChange(v)
                    }}
                    placeholder="Amount"
                  />
                </>
              )
            }}
          />
        )}
      />

      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field }) => (
          <textarea
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value || null)}
            placeholder="Description…"
            rows={1}
            className="flex-1 min-w-0 border border-t-line rounded px-2 py-1 text-xs resize-y min-h-[28px]"
          />
        )}
      />

      <button
        type="button"
        onClick={remove}
        className="text-t-faint hover:text-red-500 transition-colors text-sm px-1 shrink-0 mt-0.5"
        title="Remove line"
      >
        ✕
      </button>
    </div>
  )
}
