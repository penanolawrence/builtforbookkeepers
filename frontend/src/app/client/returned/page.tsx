'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocuments, reuploadDocument } from '@/lib/api/documents'
import { ReturnedDocumentCard } from '@/components/documents/ReturnedDocumentCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

export default function ReturnedPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: docs, isLoading } = useQuery({
    queryKey: ['returned-docs'],
    queryFn: () => getDocuments({ status: 'RETURNED' }),
  })

  const handleReupload = async (docId: string, file: File) => {
    try {
      await reuploadDocument(docId, file)
      toast({ title: 'Re-uploaded successfully.' })
      qc.invalidateQueries({ queryKey: ['returned-docs'] })
    } catch {
      toast({ title: 'Re-upload failed.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Returned Documents</h1>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : docs?.length === 0 ? (
        <EmptyState message="No returned documents." />
      ) : (
        <div className="space-y-3">
          {docs?.map((doc) => (
            <ReturnedDocumentCard
              key={doc.id}
              document={doc}
              onReupload={(file) => handleReupload(doc.id, file)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
