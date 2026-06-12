'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { TwoAreaUpload } from './TwoAreaUpload'
import { ConfirmUploadDialog } from './ConfirmUploadDialog'
import { uploadDocument } from '@/lib/api/documents'
import type { DeclaredType } from '@/types/document'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  clientId: string
  docsQueryKey: unknown[]
}

export function SubmitTab({ clientId, docsQueryKey }: Props) {
  const qc                              = useQueryClient()
  const { toast }                       = useToast()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploading,    setUploading]    = useState(false)

  function handleFilePicked(files: File[], declaredType: DeclaredType) {
    if (uploading) return
    setPendingFiles(files.map((file) => ({ file, declaredType })))
  }

  async function handleConfirmUpload(note: string) {
    const batch = pendingFiles
    setUploading(true)
    const failed: string[] = []
    for (const { file, declaredType } of batch) {
      try {
        await uploadDocument(file, declaredType, note || undefined, clientId)
      } catch {
        failed.push(file.name)
      }
    }
    setUploading(false)
    setPendingFiles([])
    const total = batch.length
    if (failed.length < total) {
      qc.invalidateQueries({ queryKey: docsQueryKey })
    }
    if (failed.length === 0) {
      toast({
        title: `${total} ${total === 1 ? 'file' : 'files'} submitted — processing…`,
      })
    } else if (failed.length === total) {
      toast({
        title: 'Upload failed — please try again.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: `${failed.length} of ${total} uploads failed — please try again.`,
        variant: 'destructive',
      })
    }
  }

  function handleManualSuccess() {
    qc.invalidateQueries({ queryKey: docsQueryKey })
    toast({ title: 'Entry submitted — processing…' })
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <TwoAreaUpload
        clientId={clientId}
        onFilePicked={handleFilePicked}
        onManualSuccess={handleManualSuccess}
      />
      <ConfirmUploadDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        uploading={uploading}
        onConfirm={handleConfirmUpload}
        onCancel={() => { if (!uploading) setPendingFiles([]) }}
      />
    </div>
  )
}
