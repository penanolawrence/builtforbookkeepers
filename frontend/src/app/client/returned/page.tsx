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
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <div className="mb-[22px]">
        <h1
          className="text-[28px] md:text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Returned
        </h1>
        <p className="text-[14px] text-t-muted mt-1">Documents that need re-uploading</p>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : docs?.data?.length === 0 ? (
        <EmptyState message="No returned documents." />
      ) : (
        <div className="space-y-3 pb-4">
          {docs?.data?.map((doc) => (
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
