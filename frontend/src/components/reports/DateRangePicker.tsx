'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}

export function DateRangePicker({ start, end, onChange }: Props) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={start}
          onChange={(e) => onChange(e.target.value, end)}
          className="w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={end}
          onChange={(e) => onChange(start, e.target.value)}
          className="w-36"
        />
      </div>
    </div>
  )
}
