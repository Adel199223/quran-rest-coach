import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createDefaultTimerSettings } from '../domain/settings'
import { addPages, startSession } from '../domain/session'
import { ContentCompanion } from './ContentCompanion'

describe('ContentCompanion', () => {
  it('stays collapsed when no session is active', () => {
    render(
      <ContentCompanion
        activeSession={null}
        readerContext={null}
        settings={createDefaultTimerSettings(0)}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /open rest coach/i })).toBeInTheDocument()
    expect(screen.queryByText(/break due soon/i)).not.toBeInTheDocument()
  })

  it('shows the break toast with action buttons when a break is active', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 2, settings, 1_000)

    render(
      <ContentCompanion
        activeSession={session}
        readerContext={null}
        settings={settings}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(screen.getByText(/break prompt is live/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /snooze 30s/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip once/i })).toBeInTheDocument()
  })

  it('shows the overdue pace toast before the next break page is reached', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 1, settings, 0)

    render(
      <ContentCompanion
        activeSession={session}
        readerContext={null}
        settings={settings}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /break due soon/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/finish this page/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
  })
})
