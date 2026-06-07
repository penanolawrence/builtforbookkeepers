'use client'

import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Role } from '@/types/auth'
import api from '@/lib/api/client'
import type { ClientProfile } from '@/types/admin'

interface Props {
  value: string
  onChange: (clientId: string) => void
  role: Role
}

export function ReportClientSelector({ value, onChange, role }: Props) {
  const isAdmin = role === 'admin'
  const isAccountant = role === 'accountant'

  const { data: clients } = useQuery({
    queryKey: ['report-clients', role],
    queryFn: async () => {
      if (isAdmin) {
        const res = await getClients()
        return res.data
      }
      if (isAccountant) {
        const { data } = await api.get<ClientProfile[]>('/accountant/clients')
        return data
      }
      return []
    },
    enabled: isAdmin || isAccountant,
  })

  if (role === 'client') return null

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select client..." />
      </SelectTrigger>
      <SelectContent>
        {(clients ?? []).map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
