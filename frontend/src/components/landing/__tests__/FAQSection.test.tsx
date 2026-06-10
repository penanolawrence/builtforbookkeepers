import { render, screen, fireEvent } from '@testing-library/react'
import { FAQSection } from '../FAQSection'

describe('FAQSection', () => {
  it('renders all 5 questions as buttons', () => {
    render(<FAQSection />)
    expect(screen.getByRole('button', { name: /do my clients need to download an app/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can i manage multiple sme clients/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /is it bir-compliant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /what if the ai misclassifies/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can clients see what the accountant is doing/i })).toBeInTheDocument()
  })

  it('opens the first item by default (aria-expanded=true)', () => {
    render(<FAQSection />)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    expect(firstBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('second item is closed by default (aria-expanded=false)', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    expect(secondBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking a closed item opens it', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    fireEvent.click(secondBtn)
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('clicking the open item closes it', () => {
    render(<FAQSection />)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    fireEvent.click(firstBtn)
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('opening a new item closes the previously open item', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    fireEvent.click(secondBtn)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false')
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
