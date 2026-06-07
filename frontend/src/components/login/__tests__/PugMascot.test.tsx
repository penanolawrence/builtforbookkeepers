import { render, screen } from '@testing-library/react'
import PugMascot from '../PugMascot'

const base = {
  variant: 'sofia' as const,
  accent: '#E2568C',
  accentGlow: '#FFADD2',
  peeking: false,
  happy: false,
}

describe('PugMascot', () => {
  it('renders with aria-label for sofia', () => {
    render(<PugMascot {...base} />)
    expect(screen.getByLabelText('Sofia, the AI pug')).toBeInTheDocument()
  })

  it('renders with aria-label for yoda', () => {
    render(<PugMascot {...base} variant="yoda" accent="#7C9CFF" accentGlow="#AFC4FF" />)
    expect(screen.getByLabelText('Yoda, the AI pug')).toBeInTheDocument()
  })

  it('paws are visible when peeking=true', () => {
    const { container } = render(<PugMascot {...base} peeking={true} />)
    const paws = container.querySelector('.paws') as HTMLElement
    expect(paws.style.opacity).toBe('1')
  })

  it('paws are hidden when peeking=false', () => {
    const { container } = render(<PugMascot {...base} peeking={false} />)
    const paws = container.querySelector('.paws') as HTMLElement
    expect(paws.style.opacity).toBe('0')
  })
})
