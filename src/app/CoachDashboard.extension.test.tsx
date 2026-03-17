import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CoachDashboard } from './CoachDashboard'
import { createDefaultTimerSettings } from '../domain/settings'
import type { ReaderContext } from '../domain/contracts'

function noop() {}

describe('CoachDashboard extension mode', () => {
  it('shows reader context and compact session details in extension mode', () => {
    const settings = createDefaultTimerSettings(0)
    const readerContext: ReaderContext = {
      schemaVersion: 1,
      routeKind: 'verse',
      locale: 'pt',
      url: 'https://quran.com/pt/2/255',
      chapterId: '2',
      verseKey: '2:255',
      pageNumber: 42,
      hizbNumber: 4,
      automaticTrackingAvailable: true,
      updatedAtMs: 1_000,
    }

    render(
      <CoachDashboard
        mode="extension"
        appTitle="Quran Rest Coach"
        summaryLabel="Micro break at page 2."
        settings={settings}
        surface="session"
        onSurfaceChange={noop}
        status="reading"
        statusLabel="Reading"
        pageCount={1}
        nextBreakLabel="Micro break at page 2"
        estimatedToBreakLabel="~1:05"
        paceHint="Break due soon when you finish this page."
        timeline={[]}
        historyEntries={[]}
        settingsValues={{
          paceSecondsPerTwoPages: settings.paceSecondsPerTwoPages,
          shortBreakEveryPages: 2,
          shortBreakSeconds: 15,
          mediumBreakEveryPages: 5,
          mediumBreakSeconds: 60,
          longBreakEveryPages: 10,
          longBreakSeconds: 120,
          softChime: settings.softChimeEnabled,
          reducedMotion: settings.reducedMotion,
          largeText: settings.largeText,
          highContrast: settings.highContrast,
          sepiaTheme: settings.sepiaTheme,
          resumeOnReopen: settings.resumeOnReopen,
        }}
        readerContext={readerContext}
        trackingLabel="Automatic tracking live"
        trackingCopy="This Quran.com view exposes stable page metadata."
        pauseLabel="Pause"
        liveAnnouncement=""
        portabilityMessage={null}
        portabilityBusy={false}
        breakTitle=""
        breakReason=""
        breakSuggestion=""
        breakCountdownSeconds={0}
        breakOpen={false}
        onStartSession={noop}
        onAddPage={noop}
        onAddTwoPages={noop}
        onUndo={noop}
        onPauseToggle={noop}
        onEndSession={noop}
        onResumeNow={noop}
        onSkipBreak={noop}
        onSnoozeBreak={noop}
        onSettingsChange={noop}
        onResetSettings={noop}
        onResetHistory={noop}
        onExportData={noop}
        onImportData={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /verse view/i })).toBeInTheDocument()
    expect(screen.getByText(/automatic tracking live/i)).toBeInTheDocument()
    expect(screen.getByText(/session details/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /keyboard shortcuts/i })).not.toBeInTheDocument()
  })
})
