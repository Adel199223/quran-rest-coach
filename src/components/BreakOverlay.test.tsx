import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BreakOverlay } from './BreakOverlay'

describe('BreakOverlay', () => {
  it('uses a calmer ready label when the countdown reaches zero', () => {
    render(
      <BreakOverlay
        isOpen={true}
        breakTitle="Micro break"
        breakReason="Page 2 reached while reading on Quran.com."
        countdownSeconds={0}
        suggestion="Blink slowly and reset."
        onResumeNow={vi.fn()}
        onSnooze={vi.fn()}
        onSkipOnce={vi.fn()}
      />,
    )

    expect(screen.getByText(/ready to resume/i)).toBeInTheDocument()
    expect(screen.queryByText(/^0:00$/)).not.toBeInTheDocument()
  })

  it('keeps snooze and skip behind more options in calm mode', async () => {
    const user = userEvent.setup()

    render(
      <BreakOverlay
        isOpen={true}
        breakTitle="Micro break"
        breakReason="Page 2 reached while reading on Quran.com."
        countdownSeconds={8}
        suggestion="Blink slowly and reset."
        onResumeNow={vi.fn()}
        onSnooze={vi.fn()}
        onSkipOnce={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /resume now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /snooze 30s/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /skip once/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /more options/i }))

    expect(screen.getByRole('button', { name: /snooze 30s/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip once/i })).toBeInTheDocument()
  })

  it('shows the rest countdown only when explicitly enabled', () => {
    render(
      <BreakOverlay
        isOpen={true}
        breakTitle="Micro break"
        breakReason="Page 2 reached while reading on Quran.com."
        countdownSeconds={8}
        showCountdown={true}
        suggestion="Blink slowly and reset."
        onResumeNow={vi.fn()}
        onSnooze={vi.fn()}
        onSkipOnce={vi.fn()}
      />,
    )

    expect(screen.getByText(/0:08 remaining/i)).toBeInTheDocument()
    expect(screen.queryByText(/micro break underway/i)).not.toBeInTheDocument()
  })
})
