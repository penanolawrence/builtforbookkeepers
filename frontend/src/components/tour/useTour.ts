import { useRef, useState } from 'react'
import type { TourStep } from './types'

interface UseTourOptions {
  onFinish: () => void
  onSkip: () => void
}

export function useTour(steps: TourStep[], { onFinish, onSkip }: UseTourOptions) {
  const [isActive, setIsActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const indexRef = useRef(currentIndex)
  indexRef.current = currentIndex
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive

  const start = () => {
    indexRef.current = 0
    isActiveRef.current = true
    setCurrentIndex(0)
    setIsActive(true)
  }

  const next = () => {
    if (!isActiveRef.current) {
      return
    }
    if (indexRef.current >= steps.length - 1) {
      isActiveRef.current = false
      setIsActive(false)
      onFinish()
      return
    }
    indexRef.current += 1
    setCurrentIndex(indexRef.current)
  }

  const back = () => {
    indexRef.current = Math.max(0, indexRef.current - 1)
    setCurrentIndex(indexRef.current)
  }

  const skip = () => {
    isActiveRef.current = false
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
