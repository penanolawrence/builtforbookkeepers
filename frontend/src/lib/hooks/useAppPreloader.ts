// frontend/src/lib/hooks/useAppPreloader.ts
'use client'

import { useEffect, useRef } from 'react'
import { searchSubtypes } from '@/lib/api/subtypes'
import { getAccounts } from '@/lib/api/accounts'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { localCache } from '@/lib/localCache'
import type { User } from '@/types/auth'

const TTL_24H = 24 * 60 * 60 * 1000
const TTL_30M = 30 * 60 * 1000
const TTL_1H  = 60 * 60 * 1000

export function useAppPreloader(user: User | null): void {
  const ran = useRef(false)

  useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    void preload(user)
  }, [user?.id])
}

async function preload(user: User): Promise<void> {
  // 1. Subtypes (all roles, global)
  if (!localCache.get('subtypes')) {
    try {
      const subtypes = await searchSubtypes()
      localCache.set('subtypes', subtypes, TTL_24H)
    } catch { /* silent — cache miss means combobox falls back to server search */ }
  }

  if (user.role === 'accountant') {
    await preloadAccountantData(user.id)
  }

  if (user.role === 'admin') {
    await preloadAdminData(user.id)
  }
}

async function preloadAccountantData(userId: string): Promise<void> {
  const clientsKey = `clients_${userId}`
  let clientIds: string[] = []

  if (!localCache.get(clientsKey)) {
    try {
      const result = await getAccountantClients({ per_page: 100 })
      localCache.set(clientsKey, result.data, TTL_30M)
      clientIds = result.data.map((c) => c.id)
    } catch { return }
  } else {
    const cached = localCache.get<{ id: string }[]>(clientsKey)
    clientIds = cached?.map((c) => c.id) ?? []
  }

  await Promise.all(
    clientIds.map(async (clientId) => {
      const key = `accounts_${clientId}`
      if (localCache.get(key)) return
      try {
        const accounts = await getAccounts(clientId)
        localCache.set(key, accounts, TTL_24H)
      } catch { /* silent */ }
    })
  )
}

async function preloadAdminData(userId: string): Promise<void> {
  const clientsKey = `clients_${userId}`
  let clientIds: string[] = []

  if (!localCache.get(clientsKey)) {
    try {
      const result = await getClients()
      localCache.set(clientsKey, result.data, TTL_30M)
      clientIds = result.data.map((c: { id: string }) => c.id)
    } catch { return }
  } else {
    const cached = localCache.get<{ id: string }[]>(clientsKey)
    clientIds = cached?.map((c) => c.id) ?? []
  }

  await Promise.all(
    clientIds.map(async (clientId) => {
      const key = `accounts_${clientId}`
      if (localCache.get(key)) return
      try {
        const accounts = await getAccounts(clientId)
        localCache.set(key, accounts, TTL_24H)
      } catch { /* silent */ }
    })
  )

  if (!localCache.get('accountants')) {
    try {
      const accountants = await getAccountants()
      localCache.set('accountants', accountants, TTL_1H)
    } catch { /* silent */ }
  }
}
