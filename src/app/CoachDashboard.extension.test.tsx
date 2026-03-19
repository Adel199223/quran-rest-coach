import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CoachDashboard } from './CoachDashboard'
import { buildReadingIntentOptions } from './view-model'
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
        summaryLabel="Micro break in 1 page."
        settings={settings}
        surface="session"
        onSurfaceChange={noop}
        status="reading"
        statusLabel="Reading"
        pageCount={1}
        readingIntent="understand"
        readingIntentOptions={buildReadingIntentOptions()}
        nextBreakLabel="Micro break in 1 page"
        estimatedToBreakLabel="About 1 min"
        resumeAnchorLabel="Page 42, verse 2:255"
        nextGoalLabel="Read 1 page, then check the meaning."
        parkForLaterLabel="Park this verse for later"
        parkedCount={1}
        paceHint="Break due soon when you finish this page."
        timeline={[]}
        historyEntries={[]}
        studyLaterItems={[]}
        settingsValues={{
          paceSecondsPerTwoPages: settings.paceSecondsPerTwoPages,
          shortBreakEveryPages: 2,
          shortBreakSeconds: 15,
          mediumBreakEveryPages: 5,
          mediumBreakSeconds: 60,
          longBreakEveryPages: 10,
          longBreakSeconds: 120,
          showBetweenBreakCountdown: settings.showBetweenBreakCountdown,
          readingPressureMode: settings.readingPressureMode,
          deadlineWarningCueEnabled: settings.deadlineWarningCueEnabled,
          showRestCountdown: settings.showRestCountdown,
          softChime: settings.softChimeEnabled,
          preStartCountdownSeconds: settings.preStartCountdownSeconds,
          preStartWarningCueEnabled: settings.preStartWarningCueEnabled,
          simplifiedReadingPanel: settings.simplifiedReadingPanel,
          reducedMotion: settings.reducedMotion,
          largeText: settings.largeText,
          highContrast: settings.highContrast,
          sepiaTheme: settings.sepiaTheme,
          resumeOnReopen: settings.resumeOnReopen,
        }}
        readerContext={readerContext}
        trackingLabel="Automatic tracking on"
        trackingCopy=""
        pauseLabel="Pause"
        liveAnnouncement=""
        portabilityMessage={null}
        portabilityBusy={false}
        breakTitle=""
        breakReason=""
        breakSuggestion=""
        breakCountdownSeconds={0}
        breakOpen={false}
        canStart={false}
        canAddPage={true}
        canAddTwoPages={true}
        canUndo={false}
        canPause={true}
        canEnd={true}
        onSelectReadingIntent={noop}
        onStartSession={noop}
        onAddPage={noop}
        onAddTwoPages={noop}
        onUndo={noop}
        onPauseToggle={noop}
        onEndSession={noop}
        onParkForLater={noop}
        onResumeNow={noop}
        onSkipBreak={noop}
        onSnoozeBreak={noop}
        onSettingsChange={noop}
        onResetSettings={noop}
        onResetHistory={noop}
        onRemoveStudyLater={noop}
        onExportData={noop}
        onImportData={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /verse view/i })).toBeInTheDocument()
    expect(screen.getByText(/automatic tracking on/i)).toBeInTheDocument()
    expect(screen.getByText(/session details/i)).toBeInTheDocument()
    expect(screen.getByText(/^break target$/i)).toBeInTheDocument()
    expect(screen.getByText(/^micro break$/i)).toBeInTheDocument()
    expect(screen.getByText(/^in 1 page$/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start session/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /correct \+1/i })).not.toBeInTheDocument()
    expect(screen.getByText(/correction tools/i)).toBeInTheDocument()
    expect(screen.getByText(/^status$/i)).toBeInTheDocument()
    expect(screen.getByText(/^reading$/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/this quran\.com view exposes stable page metadata/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /keyboard shortcuts/i })).not.toBeInTheDocument()
  })

  it('uses non-reading fallback copy without blank location fields on unknown routes', () => {
    const settings = createDefaultTimerSettings(0)
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

    render(
      <CoachDashboard
        mode="extension"
        appTitle="Quran Rest Coach"
        summaryLabel="Default pace: 2:10 for two pages."
        settings={settings}
        surface="session"
        onSurfaceChange={noop}
        status="idle"
        statusLabel="Ready"
        pageCount={0}
        readingIntent="flow"
        readingIntentOptions={buildReadingIntentOptions()}
        nextBreakLabel="Micro break in 2 pages"
        estimatedToBreakLabel="About 2 min"
        resumeAnchorLabel="Your first small reading step"
        nextGoalLabel="Read 2 pages before checking in again."
        parkForLaterLabel={null}
        parkedCount={0}
        paceHint={null}
        timeline={[]}
        historyEntries={[]}
        studyLaterItems={[]}
        settingsValues={{
          paceSecondsPerTwoPages: settings.paceSecondsPerTwoPages,
          shortBreakEveryPages: 2,
          shortBreakSeconds: 15,
          mediumBreakEveryPages: 5,
          mediumBreakSeconds: 60,
          longBreakEveryPages: 10,
          longBreakSeconds: 120,
          showBetweenBreakCountdown: settings.showBetweenBreakCountdown,
          readingPressureMode: settings.readingPressureMode,
          deadlineWarningCueEnabled: settings.deadlineWarningCueEnabled,
          showRestCountdown: settings.showRestCountdown,
          softChime: settings.softChimeEnabled,
          preStartCountdownSeconds: settings.preStartCountdownSeconds,
          preStartWarningCueEnabled: settings.preStartWarningCueEnabled,
          simplifiedReadingPanel: settings.simplifiedReadingPanel,
          reducedMotion: settings.reducedMotion,
          largeText: settings.largeText,
          highContrast: settings.highContrast,
          sepiaTheme: settings.sepiaTheme,
          resumeOnReopen: settings.resumeOnReopen,
        }}
        readerContext={readerContext}
        trackingLabel="Open a reading view"
        trackingCopy="Open a reading view for automatic page tracking. You can still log pages manually."
        pauseLabel="Pause"
        liveAnnouncement=""
        portabilityMessage={null}
        portabilityBusy={false}
        breakTitle=""
        breakReason=""
        breakSuggestion=""
        breakCountdownSeconds={0}
        breakOpen={false}
        onSelectReadingIntent={noop}
        onStartSession={noop}
        onAddPage={noop}
        onAddTwoPages={noop}
        onUndo={noop}
        onPauseToggle={noop}
        onEndSession={noop}
        onParkForLater={noop}
        onResumeNow={noop}
        onSkipBreak={noop}
        onSnoozeBreak={noop}
        onSettingsChange={noop}
        onResetSettings={noop}
        onResetHistory={noop}
        onRemoveStudyLater={noop}
        onExportData={noop}
        onImportData={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /home or non-reading view/i })).toBeInTheDocument()
    expect(screen.getByText(/open a reading view for automatic page tracking/i)).toBeInTheDocument()
    expect(screen.queryByText(/^chapter$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^verse$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^page$/i)).not.toBeInTheDocument()
  })
})
