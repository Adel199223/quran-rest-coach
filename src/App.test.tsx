import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { startSession } from './domain'
import { createLocalStorageRepository } from './lib/storage'

describe('Quran Rest Coach app', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts a session and opens the first break overlay after two pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /start now/i }))
    await user.click(screen.getByRole('button', { name: /add 2 pages/i }))

    expect(screen.getByRole('dialog', { name: /micro break/i })).toBeInTheDocument()
    expect(screen.getByText(/blink slowly, relax your jaw/i)).toBeInTheDocument()
  })

  it('persists settings updates to local storage', async () => {
    const user = userEvent.setup()
    const repository = createLocalStorageRepository()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /advanced timing/i }))

    const paceInput = screen.getByLabelText(/default pace for 2 pages/i)
    fireEvent.change(paceInput, { target: { value: '150' } })
    await user.click(screen.getByLabelText(/show countdown while reading/i))
    await user.click(screen.getByLabelText(/pressure timer while reading/i))
    await user.click(screen.getByLabelText(/play a soft cue in the final 10 seconds/i))
    fireEvent.change(screen.getByLabelText(/start delay before reading/i), {
      target: { value: '7' },
    })
    await user.click(screen.getByLabelText(/play a soft cue before reading starts/i))

    await waitFor(async () => {
      const settings = await repository.getTimerSettings()
      expect(settings.paceSecondsPerTwoPages).toBe(150)
      expect(settings.showBetweenBreakCountdown).toBe(false)
      expect(settings.readingPressureMode).toBe(false)
      expect(settings.deadlineWarningCueEnabled).toBe(false)
      expect(settings.preStartCountdownSeconds).toBe(7)
      expect(settings.preStartWarningCueEnabled).toBe(false)
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

  it('keeps a finished session on the Session surface and lets you open history', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /start now/i }))
    await user.click(screen.getByRole('button', { name: /add 2 pages/i }))
    await user.click(screen.getByRole('button', { name: /resume now/i }))
    await user.click(screen.getByRole('button', { name: /end session/i }))

    expect(screen.getByRole('heading', { name: /session complete/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view history/i }))
    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByText(/session records/i)).toBeInTheDocument()
  })

  it('replaces the start action once a session is already running', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))

    expect(screen.queryByRole('button', { name: /start session/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('keeps idle controls focused on the start action', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add 1 page/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add 2 pages/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^pause$/i })).not.toBeInTheDocument()
  })

  it('lets you choose a reading intent before starting a session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /understand/i }))
    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /start now/i }))

    expect(screen.getByText(/^intent$/i)).toBeInTheDocument()
    expect(screen.getByText(/^understand$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/read 1 page, then check the meaning/i).length).toBeGreaterThan(0)
  })

  it('reveals secondary break actions only after opening more options', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /start now/i }))
    await user.click(screen.getByRole('button', { name: /add 2 pages/i }))

    expect(screen.getByRole('button', { name: /resume now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /snooze 30s/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /more options/i }))

    expect(screen.getByRole('button', { name: /snooze 30s/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip once/i })).toBeInTheDocument()
  })

  it('applies calm-focus defaults from settings', async () => {
    const user = userEvent.setup()
    const repository = createLocalStorageRepository()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByLabelText(/show countdown during breaks/i))
    await user.click(screen.getByLabelText(/play sound at break/i))
    await user.click(screen.getByLabelText(/pressure timer while reading/i))
    fireEvent.change(screen.getByLabelText(/start delay before reading/i), {
      target: { value: '6' },
    })
    await user.click(screen.getByLabelText(/play a soft cue before reading starts/i))
    await user.click(screen.getByRole('button', { name: /apply calm-focus defaults/i }))

    await waitFor(async () => {
      const settings = await repository.getTimerSettings()
      expect(settings.showRestCountdown).toBe(false)
      expect(settings.showBetweenBreakCountdown).toBe(false)
      expect(settings.readingPressureMode).toBe(false)
      expect(settings.softChimeEnabled).toBe(false)
      expect(settings.preStartCountdownSeconds).toBe(6)
      expect(settings.preStartWarningCueEnabled).toBe(false)
      expect(settings.simplifiedReadingPanel).toBe(true)
      expect(settings.largeText).toBe(true)
      expect(settings.sepiaTheme).toBe(true)
    })
  })

  it('lets you cancel the pre-start countdown without creating a session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start session/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /end session/i })).not.toBeInTheDocument()
  })

  it('starts automatically when the pre-start countdown reaches zero', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /settings/i }))
    fireEvent.change(screen.getByLabelText(/start delay before reading/i), {
      target: { value: '1' },
    })
    await user.click(screen.getByRole('button', { name: /^session$/i }))
    await user.click(screen.getByRole('button', { name: /start session/i }))

    expect(screen.getByText(/^1$/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start now/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument()
    }, { timeout: 2_500 })
  })
})
