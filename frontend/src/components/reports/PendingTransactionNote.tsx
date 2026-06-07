interface Props {
  count: number
}

export function PendingTransactionNote({ count }: Props) {
  if (count === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2 text-sm text-amber-800">
      {count} transaction{count !== 1 ? 's' : ''} pending approval — totals may not be final
    </div>
  )
}
