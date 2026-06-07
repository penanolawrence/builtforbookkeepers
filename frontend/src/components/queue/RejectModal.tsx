'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading?: boolean
}

export function RejectModal({ open, onConfirm, onCancel, loading }: Props) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Rejection Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this document is being rejected (min 10 characters)..."
            rows={4}
          />
          {reason.length > 0 && !isValid && (
            <p className="text-xs text-destructive">Reason must be at least 10 characters.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => isValid && onConfirm(reason.trim())}
            disabled={!isValid || loading}
          >
            {loading ? 'Rejecting...' : 'Reject Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
