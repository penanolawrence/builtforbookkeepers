import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  clientName: string
  isSuspended?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function SuspendClientModal({ open, clientName, isSuspended, onConfirm, onCancel, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSuspended ? 'Reactivate Client' : 'Suspend Client'}</DialogTitle>
          <DialogDescription>
            {isSuspended
              ? `Reactivate ${clientName}? They will regain login access.`
              : `Suspend ${clientName}? Client will immediately lose login access.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant={isSuspended ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSuspended ? 'Reactivate' : 'Suspend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
