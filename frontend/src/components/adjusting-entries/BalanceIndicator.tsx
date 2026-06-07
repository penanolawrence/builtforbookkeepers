import { formatCurrency } from '@/lib/utils/formatCurrency'

interface Line {
  debit: number | null
  credit: number | null
}

export function BalanceIndicator({ lines }: { lines: Line[] }) {
  const totalDebits = lines.reduce((s, l) => s + (l.debit ?? 0), 0)
  const totalCredits = lines.reduce((s, l) => s + (l.credit ?? 0), 0)
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01
  const hasAmounts = lines.some((l) => l.debit || l.credit)

  const hint = !hasAmounts
    ? 'Enter amounts to enable submit.'
    : balanced
      ? 'Entry is balanced and ready to submit.'
      : 'Debits and credits must be equal to submit.'

  return (
    <div className="space-y-1">
      <p className={`text-sm font-medium ${balanced && hasAmounts ? 'text-green-700' : 'text-red-600'}`}>
        Debits: {formatCurrency(totalDebits)} · Credits: {formatCurrency(totalCredits)}
        {balanced && hasAmounts ? ' ✓ Balanced' : balanced ? '' : ' ✗ Unbalanced'}
      </p>
      <p className="text-xs text-muted-foreground">
        {hint}
      </p>
    </div>
  )
}
