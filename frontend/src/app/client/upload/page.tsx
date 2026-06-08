'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TwoAreaUpload } from '@/components/upload/TwoAreaUpload'
import { ConfirmUploadDialog } from '@/components/upload/ConfirmUploadDialog'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { uploadDocument, getDocuments, reuploadDocument, cancelDocument } from '@/lib/api/documents'
import { useToast } from '@/hooks/use-toast'
import type { DeclaredType, Document } from '@/types/document'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

export default function UploadPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [pendingFiles, setPendingFiles] = useState<Array<{
    file: File
    declaredType: DeclaredType
  }>>([])
  const [uploading, setUploading] = useState(false)

  const { data: allDocs = [] } = useQuery({
    queryKey: ['client-documents-upload'],
    queryFn: () => getDocuments(),
    refetchInterval: 8000,
  })

  const now = new Date()
  const thisMonth = allDocs.filter((d) => {
    const c = new Date(d.createdAt)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })
  const incomeCount  = thisMonth.filter((d) => d.declaredType === 'income').length
  const expenseCount = thisMonth.filter((d) => d.declaredType === 'expense').length

  const inProgress = allDocs.filter((d) =>
    ['PROCESSING', 'PARKED', 'RETURNED'].includes(d.status)
  )

  function handleFilePicked(files: File[], declaredType: DeclaredType) {
    if (uploading) return
    setPendingFiles(files.map((file) => ({ file, declaredType })))
  }

  async function handleConfirmUpload(note: string) {
    const batch = pendingFiles
    setPendingFiles([])
    setUploading(true)
    const failed: string[] = []
    for (const { file, declaredType } of batch) {
      try {
        await uploadDocument(file, declaredType, note || undefined)
      } catch {
        failed.push(file.name)
      }
    }
    setUploading(false)
    queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    if (failed.length > 0) {
      const total = batch.length
      toast({
        title: failed.length === total
          ? 'Upload failed — please try again.'
          : `${failed.length} of ${total} uploads failed — please try again.`,
        variant: 'destructive',
      })
    }
  }

  function handleManualSuccess(_documentId: string) {
    queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    toast({ title: 'Entry submitted — processing…' })
  }

  async function handleReupload(file: File) {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await reuploadDocument(docId, file)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
      toast({ title: 'Re-uploaded — processing your document…' })
    } catch {
      toast({ title: 'Re-upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleCancel() {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await cancelDocument(docId)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
      toast({ title: 'Document withdrawn.' })
    } catch {
      toast({ title: 'Could not withdraw document', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'My Business', href: '/client' }, { label: 'Upload Documents' }]} />

      <div className="mb-[22px]">
        <h1
          className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Upload Documents
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">
          Drop files into the correct zone below
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:flex md:gap-[14px] mb-[22px]">
        <SummaryCard
          label="Income This Month"
          value={String(incomeCount)}
          subnote="files uploaded"
          valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
        />
        <SummaryCard
          label="Expense This Month"
          value={String(expenseCount)}
          subnote="files uploaded"
          valueStyle={{ color: 'var(--t-tier-review-fg)' }}
        />
        <SummaryCard
          label="In Progress"
          value={String(inProgress.length)}
          subnote="processing or in review"
          valueStyle={{ color: 'var(--t-tier-check-fg)' }}
        />
      </div>

      <TwoAreaUpload
        onFilePicked={handleFilePicked}
        onManualSuccess={handleManualSuccess}
        incomeCount={incomeCount}
        expenseCount={expenseCount}
      />

      <ConfirmUploadDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        onConfirm={handleConfirmUpload}
        onCancel={() => setPendingFiles([])}
      />

      <div className="mt-4">
        <DocumentsTable
          docs={inProgress}
          onRowClick={setSelectedDoc}
          title="In Progress"
          subtitle="Posted items removed automatically · Click a row for details"
        />
      </div>

      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
        onCancel={handleCancel}
      />
    </div>
  )
}
