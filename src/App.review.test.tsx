import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'

describe('Quran Rest Coach review scenarios', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the simplified extension reading scenario from the review query', () => {
    window.history.pushState({}, '', '/?review=reading-extension')

    render(<App />)

    expect(screen.getAllByText(/review mode: demo state only/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/automatic tracking on/i)).toBeInTheDocument()
    expect(screen.getByText(/correction tools/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /correct \+1/i })).not.toBeInTheDocument()
    expect(screen.getByText(/^break target$/i)).toBeInTheDocument()
    expect(screen.getByText(/^micro break$/i)).toBeInTheDocument()
    expect(screen.getByText(/^page 2$/i)).toBeInTheDocument()
  })

  it('renders the calm idle standalone scenario without disabled controls', () => {
    window.history.pushState({}, '', '/?review=idle-simplified-standalone')

    render(<App />)

    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add 1 page/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^pause$/i })).not.toBeInTheDocument()
  })

  it('renders the standalone history review scenario', () => {
    window.history.pushState({}, '', '/?review=history-standalone')

    render(<App />)

    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByText(/study later/i)).toBeInTheDocument()
    expect(screen.getByText(/duration/i)).toBeInTheDocument()
    expect(screen.getByText(/session records/i)).toBeInTheDocument()
  })

  it('renders the seeded pre-start review scenarios and lets them reset on refresh', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?review=pre-start-standalone')

    const { unmount } = render(<App />)

    expect(screen.getAllByText(/review mode: demo state only/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /start now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /start now/i }))

    expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument()

    unmount()
    render(<App />)

    expect(screen.getByRole('button', { name: /start now/i })).toBeInTheDocument()
  })

  it('renders the final-three pre-start review scenario', () => {
    window.history.pushState({}, '', '/?review=pre-start-final-three-standalone')

    render(<App />)

    expect(screen.getByRole('button', { name: /start now/i })).toBeInTheDocument()
    expect(screen.getByText(/^3$/i)).toBeInTheDocument()
    expect(screen.getByText(/reading starts soon/i)).toBeInTheDocument()
  })

  it('lets the break-active standalone scenario resume and reset on refresh', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?review=break-active-standalone')

    const { unmount } = render(<App />)

    expect(screen.getByRole('dialog', { name: /micro break/i })).toBeInTheDocument()
    expect(screen.getByText(/take a short break before continuing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /snooze 30s/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /resume now/i }))

    expect(screen.queryByRole('dialog', { name: /micro break/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/^reading$/i).length).toBeGreaterThan(0)

    unmount()
    render(<App />)

    expect(screen.getByRole('dialog', { name: /micro break/i })).toBeInTheDocument()
  })

  it('renders the expanded break scenario from the review query', () => {
    window.history.pushState({}, '', '/?review=break-active-standalone-expanded')

    render(<App />)

    expect(screen.getByRole('button', { name: /snooze 30s/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip once/i })).toBeInTheDocument()
  })

  it('lets the reading standalone scenario trigger the next break', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?review=reading-standalone')

    render(<App />)

    expect(screen.getByText(/page 51, verse 3:14/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /park this verse for later/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /micro break/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add 1 page/i }))

    expect(screen.getByRole('dialog', { name: /micro break/i })).toBeInTheDocument()
  })

  it('renders the standalone pressure scenarios at halfway and in the final ten seconds', () => {
    window.history.pushState({}, '', '/?review=reading-pressure-halfway-standalone')

    const { rerender } = render(<App />)

    expect(screen.getByText(/^timer$/i)).toBeInTheDocument()
    expect(screen.getByText(/^halfway$/i)).toBeInTheDocument()

    window.history.pushState({}, '', '/?review=reading-pressure-final-ten-standalone')
    rerender(<App />)

    expect(screen.getByText(/^timer$/i)).toBeInTheDocument()
    expect(screen.getByText('9s left')).toBeInTheDocument()
  })

  it('renders the standalone catch-up pressure scenario', () => {
    window.history.pushState({}, '', '/?review=reading-pressure-catch-up-standalone')

    render(<App />)

    expect(screen.getByText(/catch-up window/i)).toBeInTheDocument()
    expect(screen.getAllByText(/1 page late/i).length).toBeGreaterThan(0)
  })

  it('renders the extension-density pressure scenarios', () => {
    window.history.pushState({}, '', '/?review=reading-pressure-halfway-extension')

    const { rerender } = render(<App />)

    expect(screen.getByText(/^timer$/i)).toBeInTheDocument()
    expect(screen.getByText(/^halfway$/i)).toBeInTheDocument()
    expect(screen.getByText(/automatic tracking on/i)).toBeInTheDocument()

    window.history.pushState({}, '', '/?review=reading-pressure-final-ten-extension')
    rerender(<App />)

    expect(screen.getByText(/^timer$/i)).toBeInTheDocument()
    expect(screen.getByText('9s left')).toBeInTheDocument()
  })

  it('lets the reading review scenario save the current verse for later', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?review=reading-standalone')

    render(<App />)

    await user.click(screen.getByRole('button', { name: /park this verse for later/i }))

    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByText(/study later/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /open on quran\.com/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /open study view/i }).length).toBeGreaterThan(0)
  })

  it('renders the settings review scenarios for calm defaults and advanced timing', () => {
    window.history.pushState({}, '', '/?review=settings-calm-standalone')

    const { rerender } = render(<App />)

    expect(screen.getByRole('button', { name: /apply calm-focus defaults/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/default pace for 2 pages/i)).not.toBeInTheDocument()

    window.history.pushState({}, '', '/?review=settings-advanced-standalone')
    rerender(<App />)

    expect(screen.getByLabelText(/default pace for 2 pages/i)).toBeInTheDocument()
  })

  it('renders the saved-session resume scenario from the review query', () => {
    window.history.pushState({}, '', '/?review=resume-saved-standalone')

    render(<App />)

    expect(screen.getByRole('dialog', { name: /resume your last session/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume saved session/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard saved session/i })).toBeInTheDocument()
  })
})
