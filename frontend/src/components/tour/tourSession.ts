const KEY = 'sofia_tour_continue'

export type TourContinueTarget = 'dashboard' | 'queue' | 'client-upload'

export function getTourContinueFlag(): TourContinueTarget | null {
  const value = sessionStorage.getItem(KEY)
  return value === 'dashboard' || value === 'queue' || value === 'client-upload' ? value : null
}

export function setTourContinueFlag(target: TourContinueTarget): void {
  sessionStorage.setItem(KEY, target)
}

export function clearTourContinueFlag(): void {
  sessionStorage.removeItem(KEY)
}
