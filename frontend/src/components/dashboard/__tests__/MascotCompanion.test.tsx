import { render, screen } from '@testing-library/react'
import { MascotCompanion } from '../MascotCompanion'

// PugMascot does complex SVG + effects — mock it
jest.mock('@/components/login/PugMascot', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => <div data-testid="pug" data-variant={variant} />,
}))

describe('MascotCompanion', () => {
  it('shows "Sofia · your AI co-pilot" in sofia theme', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByText('Sofia · your AI co-pilot')).toBeInTheDocument()
  })

  it('shows "Yoda · your AI co-pilot" in yoda theme', () => {
    render(<div data-theme="yoda"><MascotCompanion theme="yoda" /></div>)
    expect(screen.getByText('Yoda · your AI co-pilot')).toBeInTheDocument()
  })

  it('passes variant to PugMascot', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByTestId('pug')).toHaveAttribute('data-variant', 'sofia')
  })

  it('renders the brief line', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByText(/2 entries need your eyes/)).toBeInTheDocument()
  })
})
