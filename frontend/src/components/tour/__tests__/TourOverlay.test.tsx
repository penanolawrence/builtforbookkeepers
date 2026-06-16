import { render, screen, fireEvent } from '@testing-library/react'
import { TourOverlay } from '../TourOverlay'
import type { TourStep } from '../types'

const step: TourStep = { targetId: 'demo-target', title: 'Demo step', body: 'Demo body copy' }

beforeEach(() => {
  document.body.innerHTML = '<div data-tour="demo-target"></div>'
})

describe('TourOverlay', () => {
  it('renders the step title and body', () => {
    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.getByText('Demo step')).toBeInTheDocument()
    expect(screen.getByText('Demo body copy')).toBeInTheDocument()
    expect(screen.getByText(/step 1 of 3/)).toBeInTheDocument()
  })

  it('does not render a Back button on the first step', () => {
    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('renders a Back button after the first step', () => {
    render(
      <TourOverlay step={step} stepNumber={2} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('shows "Finish" on the last step and "Next" otherwise', () => {
    const { rerender } = render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    rerender(
      <TourOverlay step={step} stepNumber={3} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  })

  it('respects a custom nextLabel override', () => {
    render(
      <TourOverlay
        step={step} stepNumber={3} totalSteps={3} theme="sofia"
        onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()}
        nextLabel="Go to Queue"
      />
    )
    expect(screen.getByRole('button', { name: 'Go to Queue' })).toBeInTheDocument()
  })

  it('calls onNext, onBack, and onSkip when their buttons are clicked', () => {
    const onNext = jest.fn()
    const onBack = jest.fn()
    const onSkip = jest.fn()
    render(
      <TourOverlay step={step} stepNumber={2} totalSteps={3} theme="sofia" onNext={onNext} onBack={onBack} onSkip={onSkip} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('calls onSkip when Escape is pressed', () => {
    const onSkip = jest.fn()
    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={onSkip} />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('renders the tooltip card with dialog ARIA semantics', () => {
    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('clamps the tooltip to the viewport when the target is near the right edge', () => {
    const originalRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: window.innerWidth - 50,
      right: window.innerWidth,
      bottom: 150,
      width: 50,
      height: 50,
      x: window.innerWidth - 50,
      y: 100,
      toJSON: () => {},
    }))

    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const dialog = screen.getByRole('dialog')
    const left = parseFloat(dialog.style.left)
    expect(left).toBeLessThanOrEqual(window.innerWidth - 340 - 16)

    Element.prototype.getBoundingClientRect = originalRect
  })

  it('flips the tooltip above the target when there is not enough room below', () => {
    const originalRect = Element.prototype.getBoundingClientRect
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 520,
      left: 100,
      right: 200,
      bottom: 580,
      width: 100,
      height: 60,
      x: 100,
      y: 520,
      toJSON: () => {},
    }))

    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const dialog = screen.getByRole('dialog')
    const top = parseFloat(dialog.style.top)
    expect(top).toBeLessThan(520)

    Element.prototype.getBoundingClientRect = originalRect
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true })
  })

  it('falls back to a centered dialog with no spotlight when the target is hidden (zero-size rect)', () => {
    // jsdom's default getBoundingClientRect on `demo-target` returns all zeros,
    // which is what a real browser also returns for a `display: none` element.
    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog.style.top).toBe('50%')
    expect(dialog.style.left).toBe('50%')
  })

  it('falls back to the fallbackTargetId target when the primary target is hidden', () => {
    document.body.innerHTML = '<div data-tour="demo-target"></div><div data-tour="fallback-target"></div>'
    const originalRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(function (this: Element) {
      if (this.getAttribute('data-tour') === 'fallback-target') {
        return { top: 50, left: 60, right: 140, bottom: 90, width: 80, height: 40, x: 60, y: 50, toJSON: () => {} }
      }
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }
    })

    const stepWithFallback: TourStep = { ...step, fallbackTargetId: 'fallback-target' }
    render(
      <TourOverlay step={stepWithFallback} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const spotlight = screen.getByTestId('tour-spotlight')
    expect(spotlight.style.top).toBe('42px')
    expect(spotlight.style.left).toBe('52px')

    Element.prototype.getBoundingClientRect = originalRect
  })

  it('renders the full-overlay fallback when neither the primary nor the fallback target are visible', () => {
    document.body.innerHTML = '<div data-tour="demo-target"></div><div data-tour="fallback-target"></div>'
    const stepWithFallback: TourStep = { ...step, fallbackTargetId: 'fallback-target' }

    render(
      <TourOverlay step={stepWithFallback} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog.style.top).toBe('50%')
    expect(dialog.style.left).toBe('50%')
  })

  it('scrolls the target element into view when the step targets an element below the fold', () => {
    const originalRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 1200, left: 20, right: 300, bottom: 1260, width: 280, height: 60, x: 20, y: 1200, toJSON: () => {},
    }))
    const scrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }))

    Element.prototype.getBoundingClientRect = originalRect
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('keeps the tooltip below the target when there is enough room below', () => {
    const originalRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => {},
    }))

    render(
      <TourOverlay step={step} stepNumber={1} totalSteps={3} theme="sofia" onNext={jest.fn()} onBack={jest.fn()} onSkip={jest.fn()} />
    )

    const dialog = screen.getByRole('dialog')
    const top = parseFloat(dialog.style.top)
    expect(top).toBeGreaterThan(150)

    Element.prototype.getBoundingClientRect = originalRect
  })
})
