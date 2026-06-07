'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getEntry, approveEntry, rejectEntry, updateEntry, submitEntry, getEntries,
} from '@/lib/api/adjusting-entries'
import { getAccounts } from '@/lib/api/accounts'
import { EntryForm } from '@/components/adjusting-entries/EntryForm'
import { EntryStatusBadge } from '@/components/adjusting-entries/EntryStatusBadge'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import type { AdjustingEntry } from '@/types/adjusting-entry'

interface Props {
  params: { id: string }
}

function LinesTable({ entry }: { entry: AdjustingEntry }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="px-3 py-2 text-left font-medium">Account</th>
            <th className="px-3 py-2 text-right font-medium">Debit</th>
            <th className="px-3 py-2 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((l, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{l.accountCode}</td>
              <td className="px-3 py-2">{l.accountName}</td>
              <td className="px-3 py-2 text-right">
                {l.debit != null ? formatCurrency(l.debit) : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                {l.credit != null ? formatCurrency(l.credit) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminEntryDetailPage({ params }: Props) {
  const { id } = params
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
    queryFn: () => getAccounts(entry!.companyId),
    enabled: !!entry?.companyId && entry?.status === 'DRAFT',
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!entry) return <p className="text-sm text-destructive">Entry not found.</p>

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveEntry(id)
      toast({ title: 'Entry approved.' })
      queryClient.invalidateQueries({ queryKey: ['adjusting-entry', id] })
      router.push('/admin/adjusting-entries')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setLoading(true)
    try {
      await rejectEntry(id, rejectReason)
      toast({ title: 'Entry rejected.' })
      router.push('/admin/adjusting-entries')
    } finally {
      setLoading(false)
    }
  }

  const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    await updateEntry(id, {
      date: data.date,
      memo: data.memo,
      type: data.type,
      lines: data.lines,
    })
    await submitEntry(id, true)
    toast({ title: 'Entry approved.' })
    router.push('/admin/adjusting-entries')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/adjusting-entries">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Entries
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {entry.refNumber ?? 'Adjusting Entry'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {entry.companyName} · {entry.date ? formatDate(entry.date) : '—'} · {entry.type}
          </p>
        </div>
        <EntryStatusBadge status={entry.status} />
      </div>

      {entry.status === 'PENDING' && (
        <div className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Submitted by {entry.createdBy} — awaiting your approval.
          </div>

          <p className="text-sm font-medium">Memo: {entry.memo}</p>
          <LinesTable entry={entry} />

          {!showRejectInput ? (
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectInput(true)} disabled={loading}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this entry is being rejected..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectReason.trim()}>
                  Confirm Rejection
                </Button>
                <Button variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {entry.status === 'DRAFT' && (
        <EntryForm
          companyId={entry.companyId}
          initialData={entry}
          onSave={onSave}
          accounts={accounts ?? []}
        />
      )}

      {entry.status === 'APPROVED' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            Approved by {entry.approvedBy} on {entry.approvedAt ? formatDate(entry.approvedAt) : '—'}
          </div>
          <p className="text-sm font-medium">Memo: {entry.memo}</p>
          <LinesTable entry={entry} />
        </div>
      )}

      {entry.status === 'REJECTED' && (
        <div className="space-y-4">
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Rejected</p>
            <p>{entry.rejectionReason}</p>
          </div>
          <p className="text-sm font-medium">Memo: {entry.memo}</p>
          <LinesTable entry={entry} />
        </div>
      )}
    </div>
  )
}
