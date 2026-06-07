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

  const handleClose = () => {
    setTyped('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
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
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
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
