import { useState } from 'react'
import type { TourStep } from './types'

interface UseTourOptions {
  onFinish: () => void
  onSkip: () => void
}

export function useTour(steps: TourStep[], { onFinish, onSkip }: UseTourOptions) {
  const [isActive, setIsActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const start = () => {
    setCurrentIndex(0)
    setIsActive(true)
  }

  const next = () => {
    if (currentIndex >= steps.length - 1) {
      setIsActive(false)
      onFinish()
      return
    }
    setCurrentIndex((i) => i + 1)
  }

  const back = () => {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  const skip = () => {
    setIsActive(false)
    onSkip()
  }

  return {
    isActive,
    currentIndex,
    currentStep: steps[currentIndex],
    total: steps.length,
    start,
    next,
    back,
    skip,
  }
}
