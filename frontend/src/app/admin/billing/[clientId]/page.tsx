'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getClient } from '@/lib/api/admin/clients'
import { getClientPayments } from '@/lib/api/admin/billing'
import { BillingRecordRow } from '@/components/admin/BillingRecordRow'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: { clientId: string }
}

export default function AdminClientBillingPage({ params }: Props) {
  const { clientId } = params
  const queryClient = useQueryClient()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data: client } = useQuery({
    queryKey: ['admin-client', clientId],
    queryFn: () => getClient(clientId),
  })

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-client-payments', clientId],
    queryFn: () => getClientPayments(clientId),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/clients/${clientId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Client
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Payments — {client?.name ?? '...'}
        </h1>
        <Button onClick={() => setPaymentOpen(true)}>Receive Payment</Button>
      </div>

      {!payments || payments.length === 0 ? (
        <EmptyState message="No payments recorded." />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Ref No.</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <BillingRecordRow key={p.id} record={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReceivePaymentModal
        open={paymentOpen}
        clientId={clientId}
        onSuccess={() => {
          setPaymentOpen(false)
          queryClient.invalidateQueries({ queryKey: ['admin-client-payments', clientId] })
        }}
        onCancel={() => setPaymentOpen(false)}
      />
    </div>
  )
}
