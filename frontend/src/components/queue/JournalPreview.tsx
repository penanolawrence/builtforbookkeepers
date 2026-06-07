'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JournalPreviewLine } from '@/types/queue'

interface Props {
  lines: JournalPreviewLine[]
  isVat: boolean
}

export function JournalPreview({ lines, isVat }: Props) {
  const [open, setOpen] = useState(false)

  const displayLines = isVat
    ? lines
    : lines.filter(
        (l) =>
          !l.accountName.toLowerCase().includes('vat') &&
          !l.accountName.toLowerCase().includes('input') &&
          !l.accountName.toLowerCase().includes('output')
      )

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        Journal Preview
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-2 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.accountCode}</TableCell>
                  <TableCell>{line.accountName}</TableCell>
                  <TableCell className="text-right">
                    {line.debit != null ? formatCurrency(line.debit) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.credit != null ? formatCurrency(line.credit) : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
