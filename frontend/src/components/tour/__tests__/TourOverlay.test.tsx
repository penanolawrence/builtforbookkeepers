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
})
