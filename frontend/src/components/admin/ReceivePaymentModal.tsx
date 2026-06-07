'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { receivePayment } from '@/lib/api/admin/billing'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  amount: z.string().min(1, 'Required').refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0.01,
    'Amount must be greater than 0'
  ),
  dateReceived: z.string().min(1, 'Required'),
  referenceNumber: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  clientId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReceivePaymentModal({ open, clientId, onSuccess, onCancel }: Props) {
  const { toast } = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const handleClose = () => {
    reset()
    onCancel()
  }

  const onSubmit = async (data: FormValues) => {
    await receivePayment(clientId, { ...data, amount: Number(data.amount) })
    toast({ title: 'Payment recorded.' })
    reset()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input type="number" step="0.01" {...register('amount')} />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Date Received</Label>
            <Input type="date" {...register('dateReceived')} />
            {errors.dateReceived && <p className="text-xs text-red-600">{errors.dateReceived.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Reference Number</Label>
            <Input {...register('referenceNumber')} />
            {errors.referenceNumber && <p className="text-xs text-red-600">{errors.referenceNumber.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
