'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getAccountants } from '@/lib/api/admin/accountants'

interface Props {
  open: boolean
  clientId: string
  currentAccountantId: string
  onConfirm: (accountantId: string) => void
  onCancel: () => void
}

export function AssignAccountantModal({ open, currentAccountantId, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState(currentAccountantId)

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn: getAccountants,
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Accountant</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Assign to:</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select accountant..." /></SelectTrigger>
            <SelectContent>
              {(accountants ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(selected)} disabled={!selected}>Reassign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
