import api from './client'
import type { User, Role } from '@/types/auth'

function setCookies(role: string, status: string, companyId: string | null) {
  document.cookie = `b4b_role=${role}; path=/; SameSite=Lax`
  document.cookie = `b4b_status=${status}; path=/; SameSite=Lax`
  document.cookie = `b4b_company_id=${companyId ?? ''}; path=/; SameSite=Lax`
}

function clearCookies() {
  document.cookie = 'b4b_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'b4b_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'b4b_company_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export async function login(
  identifier: string,
  password: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
    identifier,
    password,
  })
  localStorage.setItem('b4b_token', data.token)
  localStorage.setItem('b4b_user', JSON.stringify(data.user))
  setCookies(data.user.role, data.user.status, data.user.companyId)
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  localStorage.removeItem('b4b_token')
  localStorage.removeItem('b4b_user')
  clearCookies()
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const { data: updated } = await api.patch<User>('/auth/profile', data)
  return updated
}

export async function validateSetupToken(
  token: string
): Promise<{ valid: boolean; role: Role; expired: boolean }> {
  const { data } = await api.get<{ valid: boolean; role: Role; expired: boolean }>(
    `/auth/validate-token?token=${token}`
  )
  return data
}

export async function setupPassword(
  token: string,
  name: string,
  password: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: User }>('/auth/setup', {
    token,
    name,
    password,
    password_confirmation: password,
  })
  localStorage.setItem('b4b_token', data.token)
  localStorage.setItem('b4b_user', JSON.stringify(data.user))
  setCookies(data.user.role, data.user.status, data.user.companyId)
  return data
}
