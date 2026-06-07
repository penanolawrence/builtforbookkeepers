export function lastSevenDayRange(): { start: string; end: string } {
  const today = new Date()
  const sixDaysAgo = new Date(today)
  sixDaysAgo.setDate(today.getDate() - 6)
  const fmt = (d: Date) =>
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
  return { start: fmt(sixDaysAgo), end: fmt(today) }
}
