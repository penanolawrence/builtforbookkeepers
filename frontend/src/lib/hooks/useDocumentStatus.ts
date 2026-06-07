'use client'

import { useEffect, useState } from 'react'
import { useSocket } from '@/lib/socket/SocketProvider'
import { getDocumentStatus } from '@/lib/api/documents'
import { DOCUMENT_STAGE_UPDATE } from '@/lib/socket/events'

const STAGE_LABELS: Record<string, string> = {
  uploading: 'Uploading...',
  preprocessing: 'Preparing...',
  ai: 'Categorizing...',
  anomaly_check: 'Checking...',
  parked: 'Awaiting review',
  read_failed: 'Could not read — queued for manual entry',
}

interface DocumentStatusState {
  stage: string
  status: string
  flag: string | null
  label: string
}

export function useDocumentStatus(documentId: string) {
  const { echo } = useSocket()
  const [state, setState] = useState<DocumentStatusState>({
    stage: 'uploading',
    status: 'processing',
    flag: null,
    label: STAGE_LABELS['uploading'],
  })

  useEffect(() => {
    if (!echo || !documentId) return

    const user = localStorage.getItem('sofia_user')
    const companyId = user ? JSON.parse(user).companyId : null
    if (!companyId) return

    // Fetch current stage immediately on mount
    getDocumentStatus(documentId).then((data) => {
      setState({
        stage:  data.stage,
        status: data.status,
        flag:   data.flag,
        label:  STAGE_LABELS[data.stage] ?? data.stage,
      })
    }).catch(() => {/* ignore — WebSocket will provide updates */})

    const channel = echo.private(`client.${companyId}`)

    const handler = (event: { documentId: string; stage: string; status: string; flag: string | null }) => {
      if (event.documentId !== documentId) return
      setState({
        stage: event.stage,
        status: event.status,
        flag: event.flag,
        label: STAGE_LABELS[event.stage] ?? event.stage,
      })
    }

    channel.listen(`.${DOCUMENT_STAGE_UPDATE}`, handler)

    const onReconnect = () => {
      getDocumentStatus(documentId).then((data) => {
        setState({
          stage: data.stage,
          status: data.status,
          flag: data.flag,
          label: STAGE_LABELS[data.stage] ?? data.stage,
        })
      })
    }

    channel.on('pusher:subscription_succeeded', onReconnect)

    return () => {
      channel.stopListening(`.${DOCUMENT_STAGE_UPDATE}`, handler)
    }
  }, [echo, documentId])

  return state
}
