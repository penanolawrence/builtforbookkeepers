import api from './client'

export interface Subtype {
  id: string
  name: string
}

export async function searchSubtypes(q?: string): Promise<Subtype[]> {
  const { data } = await api.get<Subtype[]>('/subtypes', { params: q ? { q } : undefined })
  return data
}

export async function createSubtype(name: string): Promise<Subtype> {
  const { data } = await api.post<Subtype>('/subtypes', { name })
  return data
}
