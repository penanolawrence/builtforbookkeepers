import api from './client'
import type { Document, DeclaredType, PagedDocs } from '@/types/document'

export async function uploadDocument(
  file: File,
  declaredType: DeclaredType,
  note?: string,
  clientId?: string
): Promise<{ documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('declared_type', declaredType)
  if (note) form.append('note', note)
  if (clientId) form.append('client_id', clientId)
  const { data } = await api.post<{ documentId: string }>('/documents', form)
  return data
}

export async function getDocuments(params?: {
  status?: string
  type?: string
  start?: string
  end?: string
  page?: number
  per_page?: number
  sort_dir?: 'asc' | 'desc'
}): Promise<PagedDocs> {
  const { data } = await api.get<PagedDocs>('/documents', { params })
  return data
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${id}`)
  return data
}

export async function getDocumentStatus(
  id: string
): Promise<{ documentId: string; stage: string; status: string; flag: string | null }> {
  const { data } = await api.get(`/documents/${id}/status`)
  return data
}

export async function getSignedUrl(
  id: string
): Promise<{ url: string | null; expiresAt: string | null }> {
  const { data } = await api.get(`/documents/${id}/image`)
  return data
}

export async function reuploadDocument(
  id: string,
  file: File
): Promise<{ documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ documentId: string }>(`/documents/${id}/reupload`, form)
  return data
}

export interface ManualEntryLine {
  description: string
  amount: number
}

export async function createManualEntry(payload: {
  declaredType: DeclaredType
  date: string
  paymentMethod: string
  lines: ManualEntryLine[]
  clientId?: string
  note?: string
}): Promise<{ documentId: string }> {
  const { data } = await api.post<{ documentId: string }>('/documents/manual', {
    declared_type:  payload.declaredType,
    date:           payload.date,
    payment_method: payload.paymentMethod,
    lines:          payload.lines.map((l) => ({
      description: l.description,
      amount:      l.amount,
    })),
    ...(payload.clientId ? { client_id: payload.clientId } : {}),
    ...(payload.note     ? { note: payload.note }          : {}),
  })
  return data
}

export async function getClientDocuments(
  clientId: string,
  params?: { status?: string; type?: string; start?: string; end?: string }
): Promise<Document[]> {
  const { data } = await api.get<Document[]>(`/documents/client/${clientId}`, { params })
  return data
}

export async function cancelDocument(id: string): Promise<void> {
  await api.post(`/documents/${id}/cancel`)
}
