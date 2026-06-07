import { lastSevenDayRange } from '../utils'

function localIsoDate(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function isoToday() {
  return localIsoDate(new Date())
}

function isoSixDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return localIsoDate(d)
}

describe('lastSevenDayRange', () => {
  it('returns today as end', () => {
    expect(lastSevenDayRange().end).toBe(isoToday())
  })

  it('returns 6 days ago as start', () => {
    expect(lastSevenDayRange().start).toBe(isoSixDaysAgo())
  })
})
