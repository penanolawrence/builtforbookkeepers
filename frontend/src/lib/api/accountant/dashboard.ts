import api from '../client'

export interface WeeklyStats {
  entriesProcessed: number
  autoCategorizedPct: number
  timeSavedHours: number
}

export async function getWeeklyStats(): Promise<WeeklyStats> {
  const { data } = await api.get<WeeklyStats>('/accountant/dashboard/weekly-stats')
  return data
}
