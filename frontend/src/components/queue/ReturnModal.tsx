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
  onConfirm: (note: string) => void
  onCancel: () => void
  loading?: boolean
}

export function ReturnModal({ open, onConfirm, onCancel, loading }: Props) {
  const [note, setNote] = useState('')
  const isValid = note.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Note for client</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this document is being returned (min 10 characters)..."
            rows={4}
          />
          {note.length > 0 && !isValid && (
            <p className="text-xs text-destructive">Note must be at least 10 characters.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => isValid && onConfirm(note.trim())}
            disabled={!isValid || loading}
          >
            {loading ? 'Returning...' : 'Return Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
