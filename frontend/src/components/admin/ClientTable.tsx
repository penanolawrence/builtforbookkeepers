'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ClientStatusBadge } from './ClientStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { ClientProfile, Accountant } from '@/types/admin'

interface Pagination {
  currentPage: number
  perPage: number
  total: number
}

interface Props {
  clients: ClientProfile[]
  pagination?: Pagination
  accountants?: Accountant[]
  onFilterChange: (f: { search?: string; status?: string; accountantId?: string; page?: number }) => void
}

export function ClientTable({ clients, pagination, accountants, onFilterChange }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [accountantId, setAccountantId] = useState('all')

  const apply = (overrides?: { search?: string; status?: string; accountantId?: string }) => {
    const s = overrides?.search ?? search
    const st = overrides?.status ?? status
    const a = overrides?.accountantId ?? accountantId
    onFilterChange({
      search: s || undefined,
      status: st !== 'all' ? st : undefined,
      accountantId: a !== 'all' ? a : undefined,
      page: 1,
    })
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search business name..."
          className="w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply({ search })}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); apply({ status: v }) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {accountants && accountants.length > 0 && (
          <Select value={accountantId} onValueChange={(v) => { setAccountantId(v); apply({ accountantId: v }) }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All accountants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accountants</SelectItem>
              {accountants.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" onClick={() => apply()}>Search</Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState message="No clients found." />
      ) : (
        <div className="border border-t-line rounded-lg overflow-hidden">
          <div className="px-3 pb-3">
            <table className="sb-table w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-t-faint uppercase tracking-wide">Business Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-t-faint uppercase tracking-wide">Accountant</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-t-faint uppercase tracking-wide">Plan</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-t-faint uppercase tracking-wide">VAT</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-t-faint uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-t-surface cursor-pointer"
                    onClick={() => router.push(`/admin/clients/${c.id}`)}
                  >
                    <td className="px-3 py-2 font-medium text-t-ink">{c.name}</td>
                    <td className="px-3 py-2 text-t-muted">{c.accountantName}</td>
                    <td className="px-3 py-2 capitalize text-t-muted">{c.plan}</td>
                    <td className="px-3 py-2 text-t-muted">{c.birType === 'vat' ? 'VAT' : 'Non-VAT'}</td>
                    <td className="px-3 py-2"><ClientStatusBadge status={c.clientStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="outline" size="sm"
            disabled={pagination.currentPage <= 1}
            onClick={() => onFilterChange({ page: pagination.currentPage - 1 })}
          >Prev</Button>
          <span>Page {pagination.currentPage} of {totalPages}</span>
          <Button
            variant="outline" size="sm"
            disabled={pagination.currentPage >= totalPages}
            onClick={() => onFilterChange({ page: pagination.currentPage + 1 })}
          >Next</Button>
        </div>
      )}
    </div>
  )
}
