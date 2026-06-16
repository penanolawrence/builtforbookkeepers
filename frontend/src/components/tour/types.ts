export interface TourStep {
  targetId: string
  /** Used when the primary target is hidden (e.g. by a responsive breakpoint). */
  fallbackTargetId?: string
  title: string
  body: string
}
