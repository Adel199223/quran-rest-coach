import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import App from './App'
import { startSession } from './domain'
import { createLocalStorageRepository } from './lib/storage'

describe('Quran Rest Coach app', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts a session and opens the first break overlay after two pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /\+2 pages/i }))

    expect(screen.getByRole('dialog', { name: /micro break/i })).toBeInTheDocument()
    expect(screen.getByText(/blink slowly, unclench your jaw/i)).toBeInTheDocument()
  })

  it('persists settings updates to local storage', async () => {
    const user = userEvent.setup()
    const repository = createLocalStorageRepository()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))

    const paceInput = screen.getByLabelText(/default pace for 2 pages/i)
    fireEvent.change(paceInput, { target: { value: '150' } })

    await waitFor(async () => {
      expect((await repository.getTimerSettings()).paceSecondsPerTwoPages).toBe(150)
    })
  })

  it('offers resume or discard when a saved session exists', async () => {
    const repository = createLocalStorageRepository()
    await repository.saveActiveSession(startSession(1_763_100_000_000))

    render(<App />)

    expect(await screen.findByRole('dialog', { name: /resume your last session/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume saved session/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard saved session/i })).toBeInTheDocument()
  })

  it('moves a finished session into history', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /\+2 pages/i }))
    await user.click(screen.getByRole('button', { name: /resume now/i }))
    await user.click(screen.getByRole('button', { name: /end session/i }))

    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByText(/session records/i)).toBeInTheDocument()
  })
})
