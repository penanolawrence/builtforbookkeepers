import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  icon?: ReactNode
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  )
}
