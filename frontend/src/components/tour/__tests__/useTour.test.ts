import { renderHook, act } from '@testing-library/react'
import { useTour } from '../useTour'
import type { TourStep } from '../types'

const steps: TourStep[] = [
  { targetId: 'a', title: 'Step A', body: 'Body A' },
  { targetId: 'b', title: 'Step B', body: 'Body B' },
]

describe('useTour', () => {
  it('is inactive until start() is called', () => {
    const { result } = renderHook(() => useTour(steps, { onFinish: jest.fn(), onSkip: jest.fn() }))
    expect(result.current.isActive).toBe(false)
  })

  it('activates at step 0 after start()', () => {
    const { result } = renderHook(() => useTour(steps, { onFinish: jest.fn(), onSkip: jest.fn() }))
    act(() => result.current.start())
    expect(result.current.isActive).toBe(true)
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.currentStep).toEqual(steps[0])
    expect(result.current.total).toBe(2)
  })

  it('advances to the next step on next()', () => {
    const { result } = renderHook(() => useTour(steps, { onFinish: jest.fn(), onSkip: jest.fn() }))
    act(() => result.current.start())
    act(() => result.current.next())
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.isActive).toBe(true)
  })

  it('calls onFinish and deactivates when next() is called on the last step', () => {
    const onFinish = jest.fn()
    const { result } = renderHook(() => useTour(steps, { onFinish, onSkip: jest.fn() }))
    act(() => result.current.start())
    act(() => result.current.next())
    act(() => result.current.next())
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
  })

  it('moves back a step on back(), but not before 0', () => {
    const { result } = renderHook(() => useTour(steps, { onFinish: jest.fn(), onSkip: jest.fn() }))
    act(() => result.current.start())
    act(() => result.current.next())
    act(() => result.current.back())
    expect(result.current.currentIndex).toBe(0)
    act(() => result.current.back())
    expect(result.current.currentIndex).toBe(0)
  })

  it('calls onSkip and deactivates on skip()', () => {
    const onSkip = jest.fn()
    const { result } = renderHook(() => useTour(steps, { onFinish: jest.fn(), onSkip }))
    act(() => result.current.start())
    act(() => result.current.skip())
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
  })
})
