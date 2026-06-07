'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadReportPDF } from '@/lib/api/reports'
import { downloadBIRBookPDF } from '@/lib/api/bir'
import { Download } from 'lucide-react'

interface Props {
  type: 'income-statement' | 'expense-breakdown' | string
  clientId?: string
  start: string
  end: string
  accountId?: string
  disabled?: boolean
}

export function ExportPDFButton({ type, clientId, start, end, accountId, disabled }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const params = { clientId, start, end, accountId }
      if (type === 'income-statement' || type === 'expense-breakdown') {
        await downloadReportPDF(type, params)
      } else {
        await downloadBIRBookPDF(type, params)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading || !!disabled}>
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Downloading...' : 'Download PDF'}
    </Button>
  )
}
