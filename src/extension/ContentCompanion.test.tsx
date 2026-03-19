import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReaderContext } from '../domain/contracts'
import { createDefaultTimerSettings } from '../domain/settings'
import { addPages, startSession } from '../domain/session'
import { ContentCompanion } from './ContentCompanion'

describe('ContentCompanion', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays collapsed on supported reading views when no session is active', () => {
    const readerContext: ReaderContext = {
      schemaVersion: 1,
      routeKind: 'surah',
      locale: 'en',
      url: 'https://quran.com/2',
      chapterId: '2',
      verseKey: null,
      pageNumber: 2,
      hizbNumber: null,
      automaticTrackingAvailable: true,
      updatedAtMs: 1_000,
    }

    render(
      <ContentCompanion
        activeSession={null}
        readerContext={readerContext}
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

  it('stays hidden on home and other non-reading views when no session is active', () => {
    const readerContext: ReaderContext = {
      schemaVersion: 1,
      routeKind: 'unknown',
      locale: 'en',
      url: 'https://quran.com',
      chapterId: null,
      verseKey: null,
      pageNumber: null,
      hizbNumber: null,
      automaticTrackingAvailable: false,
      updatedAtMs: 1_000,
    }

    const { container } = render(
      <ContentCompanion
        activeSession={null}
        readerContext={readerContext}
        settings={createDefaultTimerSettings(0)}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: /open rest coach/i })).not.toBeInTheDocument()
  })

  it('shows the calmer break toast with secondary actions collapsed by default', () => {
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

    expect(screen.getByText(/break time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /snooze 30s/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /skip once/i })).not.toBeInTheDocument()
  })

  it('reveals the secondary break actions after opening more options', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('button', { name: /more options/i }))

    expect(screen.getByRole('button', { name: /snooze 30s/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip once/i })).toBeInTheDocument()
  })

  it('stays hidden when the side panel is already open during a break', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 2, settings, 1_000)

    const { container } = render(
      <ContentCompanion
        activeSession={session}
        readerContext={null}
        settings={settings}
        suppressExpandedPrompt={true}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/break time/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /2 pages/i })).not.toBeInTheDocument()
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

  it('uses singular page wording in the active chip title', () => {
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

    expect(screen.getByRole('button', { name: /1 page/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /1 pages/i })).not.toBeInTheDocument()
  })

  it('mirrors the halfway pressure cue in the collapsed chip subtitle', () => {
    vi.useFakeTimers()
    vi.setSystemTime(70_000)
    const settings = {
      ...createDefaultTimerSettings(0),
      readingPressureMode: true,
    }
    const session = startSession(0, 'flow', settings)

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

    const chip = screen.getByRole('button', { name: /0 pages/i })
    expect(chip).toHaveClass('qrc-chip-phase-halfway')
    expect(chip).toHaveTextContent(/halfway · 1:00/i)
  })

  it('mirrors the final-ten pressure cue in the collapsed chip subtitle', () => {
    vi.useFakeTimers()
    vi.setSystemTime(121_000)
    const settings = {
      ...createDefaultTimerSettings(0),
      readingPressureMode: true,
    }
    const session = startSession(0, 'flow', settings)

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

    const chip = screen.getByRole('button', { name: /0 pages/i })
    expect(chip).toHaveClass('qrc-chip-phase-final-ten')
    expect(chip).toHaveTextContent(/9s left/i)
  })

  it('uses a quieter collapsed chip on supported reading views without automatic tracking', () => {
    const readerContext: ReaderContext = {
      schemaVersion: 1,
      routeKind: 'juz',
      locale: 'en',
      url: 'https://quran.com/juz/1',
      chapterId: '1',
      verseKey: null,
      pageNumber: null,
      hizbNumber: null,
      automaticTrackingAvailable: false,
      updatedAtMs: 1_000,
    }

    render(
      <ContentCompanion
        activeSession={null}
        readerContext={readerContext}
        settings={createDefaultTimerSettings(0)}
        onOpenPanel={vi.fn()}
        onResumeBreak={vi.fn()}
        onSkipBreak={vi.fn()}
        onSnoozeBreak={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /open rest coach/i })).toHaveClass(
      'qrc-chip-passive',
    )
    expect(screen.queryByText(/open a reading view/i)).not.toBeInTheDocument()
  })
})
