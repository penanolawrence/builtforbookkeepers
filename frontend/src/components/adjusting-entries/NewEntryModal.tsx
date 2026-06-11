'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createEntry, submitEntry, getEntry } from '@/lib/api/adjusting-entries'
import { getAccounts } from '@/lib/api/accounts'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { EntryForm } from './EntryForm'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  viewEntryId?: string | null
}

export function NewEntryModal({ open, onClose, isAdmin, viewEntryId }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()

  const isViewMode = !!viewEntryId

  const { data: viewEntry, isLoading: viewLoading } = useQuery({
    queryKey: ['adjusting-entry', viewEntryId],
    queryFn: () => getEntry(viewEntryId!),
    enabled: isViewMode && open,
  })

  const { data: viewAccounts } = useQuery({
    queryKey: ['accounts', viewEntry?.companyId],
    queryFn: () => getAccounts(viewEntry!.companyId),
    enabled: isViewMode && !!viewEntry?.companyId,
  })

  const { data: adminClientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
    enabled: open && !!isAdmin,
  })

  const { data: accountantClientsData } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients(),
    enabled: open && !isAdmin,
  })

  const clients: { id: string; name: string }[] = isAdmin
    ? (adminClientsData?.data ?? []).map((c) => ({ id: c.id, name: c.name }))
    : (accountantClientsData?.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedClientId],
    queryFn: () => getAccounts(selectedClientId),
    enabled: !!selectedClientId,
  })

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedClientId(undefined)
      onClose()
    }
  }

  const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { entryId } = await createEntry({
      companyId: data.companyId,
      date:      data.date,
      memo:      data.memo,
      type:      data.type,
      lines:     data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        accountId:   l.accountId,
        subtypeId:   l.subtypeId ?? null,
        debit:       l.debit,
        credit:      l.credit,
        description: l.description ?? null,
      })),
    })
    await submitEntry(entryId, true)
    toast({ title: 'Entry approved.' })
    queryClient.invalidateQueries({ queryKey: ['adjusting-entries'] })
    setSelectedClientId(undefined)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">

        {isViewMode ? (
          <>
            <DialogTitle className="text-sm font-bold text-t-ink mb-1">
              Adjusting Entry — {viewEntry?.refNumber ?? '…'}
            </DialogTitle>
            {viewEntry && (
              <p className="text-xs text-t-muted mb-4">
                {viewEntry.companyName} · {viewEntry.date} · {viewEntry.status}
              </p>
            )}
            {viewLoading || !viewEntry ? (
              <div className="py-8 text-center text-sm text-t-faint">Loading…</div>
            ) : (
              <EntryForm
                key={viewEntry.id}
                initialData={viewEntry}
                onSave={async () => {}}
                accounts={viewAccounts ?? []}
                readOnly
              />
            )}
          </>
        ) : (
          <>
            <DialogTitle className="text-sm font-bold text-t-ink mb-4">New Adjusting Entry</DialogTitle>

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1.5 block">
                Client
              </label>
              <select
                value={selectedClientId ?? ''}
                onChange={(e) => setSelectedClientId(e.target.value || undefined)}
                className="w-full border border-t-line rounded px-2 py-1.5 text-sm"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {selectedClientId && (
              <EntryForm
                key={selectedClientId}
                companyId={selectedClientId}
                onSave={onSave}
                onCancel={() => { setSelectedClientId(undefined); onClose() }}
                accounts={accounts ?? []}
                clients={clients}
              />
            )}
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
