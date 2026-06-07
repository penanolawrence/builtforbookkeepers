'use client'

import { useState, useCallback, useEffect } from 'react'
import * as authApi from '@/lib/api/auth'
import type { User } from '@/types/auth'

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('sofia_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sofia_token')
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
    setToken(getStoredToken())
  }, [])

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    const { user: loggedInUser, token: newToken } = await authApi.login(identifier, password)
    setUser(loggedInUser)
    setToken(newToken)
    window.dispatchEvent(new Event('sofia:login'))
    return loggedInUser
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setToken(null)
    window.dispatchEvent(new Event('sofia:logout'))
  }, [])

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
  }
}
