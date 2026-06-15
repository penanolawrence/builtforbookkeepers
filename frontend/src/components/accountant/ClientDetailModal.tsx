'use client'

import { ClientDetailModal as SharedModal } from '@/components/clients/ClientDetailModal'

interface Props {
  clientId: string
  onClose: () => void
}

export function ClientDetailModal({ clientId, onClose }: Props) {
  return <SharedModal clientId={clientId} role="accountant" onClose={onClose} />
}
