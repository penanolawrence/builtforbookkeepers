import { getTourContinueFlag, setTourContinueFlag, clearTourContinueFlag } from '../tourSession'

describe('tourSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns null when nothing is set', () => {
    expect(getTourContinueFlag()).toBeNull()
  })

  it('returns the value that was set', () => {
    setTourContinueFlag('queue')
    expect(getTourContinueFlag()).toBe('queue')
  })

  it('returns null after clearing', () => {
    setTourContinueFlag('dashboard')
    clearTourContinueFlag()
    expect(getTourContinueFlag()).toBeNull()
  })

  it('ignores unrecognized stored values', () => {
    sessionStorage.setItem('sofia_tour_continue', 'something-else')
    expect(getTourContinueFlag()).toBeNull()
  })
})
