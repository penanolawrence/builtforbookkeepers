'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { approveItem, returnItem, rejectItem } from '@/lib/api/queue'
import { getSignedUrl } from '@/lib/api/documents'
import { AnomalyReasonBanner } from './AnomalyReasonBanner'
import { JournalPreview } from './JournalPreview'
import { ReturnModal } from './ReturnModal'
import { RejectModal } from './RejectModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, ZoomIn, ZoomOut } from 'lucide-react'
import { computeVat } from '@/lib/utils/vatCompute'
import type { QueueItemDetail, JournalPreviewLine } from '@/types/queue'

interface Props {
  item: QueueItemDetail
  isVat: boolean
  backUrl?: string
}

interface FormValues {
  merchantName: string
  date: string
  amount: string
  vatAmount: string
  category: string
  paymentMethod: string
}

export function ReviewPanel({ item, isVat, backUrl = '/accountant/queue' }: Props) {
  const router = useRouter()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [returnOpen, setReturnOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localLines, setLocalLines] = useState<JournalPreviewLine[]>(item.journalPreview)

  useEffect(() => {
    if (!item.isNoReceipt) {
      getSignedUrl(item.documentId).then((r) => setImgUrl(r.url)).catch(() => {})
    }
  }, [item.documentId, item.isNoReceipt])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      merchantName: item.merchantName ?? '',
      date: item.date ?? '',
      amount: item.amount?.toString() ?? '',
      vatAmount: item.vatAmount?.toString() ?? '',
      category: item.category ?? '',
      paymentMethod: item.paymentMethod ?? '',
    },
  })

  useEffect(() => {
    reset({
      merchantName: item.merchantName ?? '',
      date: item.date ?? '',
      amount: item.amount?.toString() ?? '',
      vatAmount: item.vatAmount?.toString() ?? '',
      category: item.category ?? '',
      paymentMethod: item.paymentMethod ?? '',
    })
  }, [item, reset])

  const watchedAmount = watch('amount')
  const watchedPaymentMethod = watch('paymentMethod')

  useEffect(() => {
    const gross = parseFloat(watchedAmount)
    if (isNaN(gross)) return
    const isCash = watchedPaymentMethod === 'Cash' || watchedPaymentMethod === 'GCash' || watchedPaymentMethod === 'Maya' || watchedPaymentMethod === 'Bank'

    if (isVat) {
      const { net, vat } = computeVat(gross)
      if (item.declaredType === 'expense') {
        setLocalLines([
          { accountCode: 'EXP', accountName: 'Expense', debit: net, credit: null },
          { accountCode: 'VAT-IN', accountName: 'Input VAT', debit: vat, credit: null },
          { accountCode: 'CASH', accountName: isCash ? watchedPaymentMethod : 'Cash', debit: null, credit: gross },
        ])
      } else {
        setLocalLines([
          { accountCode: 'CASH', accountName: isCash ? watchedPaymentMethod : 'Cash', debit: gross, credit: null },
          { accountCode: 'INC', accountName: 'Income', debit: null, credit: net },
          { accountCode: 'VAT-OUT', accountName: 'Output VAT', debit: null, credit: vat },
        ])
      }
    } else {
      if (item.declaredType === 'expense') {
        setLocalLines([
          { accountCode: 'EXP', accountName: 'Expense', debit: gross, credit: null },
          { accountCode: 'CASH', accountName: watchedPaymentMethod || 'Cash', debit: null, credit: gross },
        ])
      } else {
        setLocalLines([
          { accountCode: 'CASH', accountName: watchedPaymentMethod || 'Cash', debit: gross, credit: null },
          { accountCode: 'INC', accountName: 'Income', debit: null, credit: gross },
        ])
      }
    }
  }, [watchedAmount, watchedPaymentMethod, isVat, item.declaredType])

  const onApprove = async (values: FormValues) => {
    setLoading(true)
    try {
      const payload = isDirty
        ? {
            fields: {
              merchantName: values.merchantName || null,
              date: values.date || null,
              amount: values.amount ? parseFloat(values.amount) : null,
              vatAmount: values.vatAmount ? parseFloat(values.vatAmount) : null,
              category: values.category || null,
              paymentMethod: values.paymentMethod || null,
            },
          }
        : undefined
      await approveItem(item.documentId, payload)
      router.push(backUrl)
    } finally {
      setLoading(false)
    }
  }

  const onReturn = async (note: string) => {
    setLoading(true)
    try {
      await returnItem(item.documentId, note)
      setReturnOpen(false)
      router.push(backUrl)
    } finally {
      setLoading(false)
    }
  }

  const onReject = async (reason: string) => {
    setLoading(true)
    try {
      await rejectItem(item.documentId, reason)
      setRejectOpen(false)
      router.push(backUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onApprove)} className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Image */}
        <div className="space-y-2">
          {item.isOcrFailed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm text-yellow-800">
              ⚠ Could not read receipt — please verify fields manually
            </div>
          )}
          <div className="relative border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-64">
            {item.isNoReceipt ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                <FileText className="h-12 w-12" />
                <p className="text-sm">No Receipt</p>
              </div>
            ) : imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt="receipt"
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
                className="max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Form */}
        <div className="space-y-3">
          {item.flag === 'RED' && <AnomalyReasonBanner anomalyReasons={item.anomalyReasons} />}

          <div className="space-y-1">
            <Label>Merchant</Label>
            <Input {...register('merchantName')} />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register('date')} />
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input type="number" step="0.01" {...register('amount')} />
          </div>
          {isVat && (
            <div className="space-y-1">
              <Label>VAT Amount</Label>
              <Input type="number" step="0.01" {...register('vatAmount')} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Category</Label>
            <Input {...register('category')} />
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select
              value={watch('paymentMethod')}
              onValueChange={(v) => setValue('paymentMethod', v, { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="GCash">GCash</SelectItem>
                <SelectItem value="Maya">Maya</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <JournalPreview lines={localLines} isVat={isVat} />
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 bg-t-card border-t pt-3 flex gap-2 flex-wrap">
        <Button type="submit" disabled={loading}>
          {isDirty ? 'Approve with Changes' : 'Approve'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setReturnOpen(true)}
          disabled={loading}
        >
          Return
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={loading}
        >
          Reject
        </Button>
      </div>

      <ReturnModal open={returnOpen} onConfirm={onReturn} onCancel={() => setReturnOpen(false)} loading={loading} />
      <RejectModal open={rejectOpen} onConfirm={onReject} onCancel={() => setRejectOpen(false)} loading={loading} />
    </form>
  )
}
