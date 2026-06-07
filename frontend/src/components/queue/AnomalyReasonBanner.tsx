interface Props {
  anomalyReasons: string[]
}

export function AnomalyReasonBanner({ anomalyReasons }: Props) {
  if (anomalyReasons.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 space-y-1">
      {anomalyReasons.map((reason, i) => (
        <p key={i} className="text-sm text-red-700">⚠ {reason}</p>
      ))}
    </div>
  )
}
