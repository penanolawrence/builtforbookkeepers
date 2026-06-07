import api from './client'
import type { BIRBook, GLBook } from '@/types/report'

export async function getBIRBook(
  book: string,
  params: { clientId?: string; start: string; end: string; accountId?: string }
): Promise<BIRBook | GLBook> {
  const { data } = await api.get(`/bir/${book}`, { params })
  return data
}

export async function downloadBIRBookPDF(
  book: string,
  params: { clientId?: string; start: string; end: string; accountId?: string }
): Promise<void> {
  const { data } = await api.get(`/bir/${book}/pdf`, {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `${book}-${params.start}-${params.end}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
