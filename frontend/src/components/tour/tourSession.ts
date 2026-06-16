const KEY = 'sofia_tour_continue'

export type TourContinueTarget = 'dashboard' | 'queue'

export function getTourContinueFlag(): TourContinueTarget | null {
  const value = sessionStorage.getItem(KEY)
  return value === 'dashboard' || value === 'queue' ? value : null
}

export function setTourContinueFlag(target: TourContinueTarget): void {
  sessionStorage.setItem(KEY, target)
}

export function clearTourContinueFlag(): void {
  sessionStorage.removeItem(KEY)
}
