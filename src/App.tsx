import { useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import {
  BreakOverlay,
  HistorySurface,
  SessionSurface,
  SettingsSurface,
  SurfaceTabs,
  type HistoryEntryView,
  type SessionTimelineEntry,
  type SettingsFormValues,
  type SurfaceKey,
} from './components'
import {
  addPages,
  computeHybridNudge,
  createDefaultTimerSettings,
  endSession,
  getNextBreakHint,
  pauseSession,
  resumeSession,
  skipBreak,
  snoozeBreak,
  startSession,
  type ActiveSession,
  type BreakKind,
  type BreakTier,
  type SessionHistoryEntry,
  type TimerSettings,
  undoLastPages,
} from './domain'
import { playSoftChime } from './lib/audio'
import {
  formatBreakKind,
  formatClockDuration,
  formatPageLabel,
  formatSessionDate,
  formatTimeStamp,
} from './lib/format'
import { createLocalStorageRepository } from './lib/storage'
import { getStrings } from './lib/strings'

const BREAK_SUGGESTIONS: Record<BreakKind, string> = {
  micro: 'Blink slowly, unclench your jaw, and let your eyes soften.',
  short: 'Look across the room and let your breathing settle before continuing.',
  long: 'Stand up, stretch, and return only when your focus feels lighter.',
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

function getThemeMode(settings: TimerSettings): 'contrast' | 'sepia' | 'plain' {
  if (settings.highContrast) {
    return 'contrast'
  }

  if (settings.sepiaTheme) {
    return 'sepia'
  }

  return 'plain'
}

function getStatusLabel(session: ActiveSession | null): string {
  if (!session || session.status === 'idle') {
    return 'Ready'
  }

  switch (session.status) {
    case 'reading':
      return 'Reading'
    case 'paused':
      return 'Paused'
    case 'break':
      return 'Resting'
    default:
      return 'Ready'
  }
}

function buildSettingsFormValues(settings: TimerSettings): SettingsFormValues {
  const [shortTier, mediumTier, longTier] = [...settings.breakTiers].sort(
    (left, right) => left.everyPages - right.everyPages,
  )

  return {
    paceSecondsPerTwoPages: settings.paceSecondsPerTwoPages,
    shortBreakEveryPages: shortTier?.everyPages ?? 2,
    shortBreakSeconds: shortTier?.durationSeconds ?? 15,
    mediumBreakEveryPages: mediumTier?.everyPages ?? 5,
    mediumBreakSeconds: mediumTier?.durationSeconds ?? 60,
    longBreakEveryPages: longTier?.everyPages ?? 10,
    longBreakSeconds: longTier?.durationSeconds ?? 120,
    softChime: settings.softChimeEnabled,
    reducedMotion: settings.reducedMotion,
    largeText: settings.largeText,
    highContrast: settings.highContrast,
    sepiaTheme: settings.sepiaTheme,
    resumeOnReopen: settings.resumeOnReopen,
  }
}

function buildBreakTiers(values: SettingsFormValues): BreakTier[] {
  const tiers: BreakTier[] = [
    {
      everyPages: Math.max(1, Math.trunc(values.shortBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.shortBreakSeconds)),
      kind: 'micro',
    },
    {
      everyPages: Math.max(1, Math.trunc(values.mediumBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.mediumBreakSeconds)),
      kind: 'short',
    },
    {
      everyPages: Math.max(1, Math.trunc(values.longBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.longBreakSeconds)),
      kind: 'long',
    },
  ]

  return tiers.sort((left, right) => right.everyPages - left.everyPages)
}

function buildTimeline(session: ActiveSession, locale: string): SessionTimelineEntry[] {
  const items: Array<SessionTimelineEntry & { sortAtMs: number }> = [
    {
      id: `${session.sessionId}-start`,
      title: 'Session started',
      detail: 'You can keep logging pages and let the app handle the rest cues.',
      timeLabel: formatTimeStamp(session.startedAtMs, locale),
      tone: 'neutral',
      sortAtMs: session.startedAtMs,
    },
  ]

  for (const pageEvent of session.pageEvents) {
    items.push({
      id: `${session.sessionId}-page-${pageEvent.atMs}`,
      title: `Logged ${formatPageLabel(pageEvent.deltaPages)}`,
      detail: `Total progress: ${formatPageLabel(pageEvent.totalPages)}.`,
      timeLabel: formatTimeStamp(pageEvent.atMs, locale),
      tone: 'progress',
      sortAtMs: pageEvent.atMs,
    })
  }

  for (const breakEntry of session.breakLog) {
    const stateLabel = breakEntry.skipped
      ? 'Skipped once.'
      : breakEntry.completedAtMs
        ? 'Completed.'
        : 'Active now.'
    const snoozeLabel =
      breakEntry.snoozeCount > 0 ? ` Snoozed ${breakEntry.snoozeCount}x.` : ''

    items.push({
      id: `${session.sessionId}-break-${breakEntry.triggeredAtMs}`,
      title: formatBreakKind(breakEntry.kind),
      detail: `Triggered at page ${breakEntry.triggerPage}. ${stateLabel}${snoozeLabel}`.trim(),
      timeLabel: formatTimeStamp(
        breakEntry.completedAtMs ?? breakEntry.triggeredAtMs,
        locale,
      ),
      tone: 'rest',
      sortAtMs: breakEntry.completedAtMs ?? breakEntry.triggeredAtMs,
    })
  }

  if (session.status === 'paused') {
    items.push({
      id: `${session.sessionId}-paused-${session.updatedAtMs}`,
      title: 'Session paused',
      detail: 'Take a breath and return when the page feels manageable again.',
      timeLabel: formatTimeStamp(session.updatedAtMs, locale),
      tone: 'neutral',
      sortAtMs: session.updatedAtMs,
    })
  }

  return items
    .sort((left, right) => right.sortAtMs - left.sortAtMs)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      timeLabel: item.timeLabel,
      tone: item.tone,
    }))
}

function buildHistoryEntries(
  entries: SessionHistoryEntry[],
  locale: string,
): HistoryEntryView[] {
  return [...entries]
    .sort((left, right) => right.startedAtMs - left.startedAtMs)
    .map((entry) => ({
      id: entry.sessionId,
      dateLabel: formatSessionDate(entry.startedAtMs, locale),
      timeRangeLabel: `${formatTimeStamp(entry.startedAtMs, locale)} to ${formatTimeStamp(entry.endedAtMs, locale)}`,
      durationLabel: formatClockDuration((entry.endedAtMs - entry.startedAtMs) / 1000),
      pagesCompleted: entry.totalPages,
      breaksTaken: entry.breaksTaken,
      snoozes: entry.snoozeCount,
      skips: entry.skippedBreaks,
      notes:
        entry.skippedBreaks > 0
          ? 'One or more break prompts were skipped before the session ended.'
          : undefined,
    }))
}

function buildSummaryLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  if (!session || session.status === 'idle') {
    return `Default pace: ${formatClockDuration(settings.paceSecondsPerTwoPages)} for two pages.`
  }

  if (session.activeBreak) {
    return `${formatBreakKind(session.activeBreak.kind)} underway.`
  }

  const nextBreak = getNextBreakHint(session.totalPages, settings.breakTiers)
  if (!nextBreak) {
    return `${formatPageLabel(session.totalPages)} logged.`
  }

  return `${formatBreakKind(nextBreak.kind)} at page ${nextBreak.triggerPage}.`
}

function App() {
  const [repository] = useState(() => createLocalStorageRepository())
  const [settings, setSettings] = useState<TimerSettings>(() =>
    repository.getTimerSettings(),
  )
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [pendingResumeSession, setPendingResumeSession] =
    useState<ActiveSession | null>(() => repository.getActiveSession())
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>(() =>
    repository.getSessionHistory(),
  )
  const [surface, setSurface] = useState<SurfaceKey>('session')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const lastBreakPromptRef = useRef<number | null>(null)

  const strings = getStrings(settings.locale)
  const currentSession = activeSession
  const nextBreakHint = getNextBreakHint(currentSession?.totalPages ?? 0, settings.breakTiers)
  const hybridNudge = currentSession
    ? computeHybridNudge(currentSession, settings, nowMs)
    : null
  const historyView = buildHistoryEntries(historyEntries, settings.locale)
  const timeline =
    currentSession && currentSession.status !== 'idle'
      ? buildTimeline(currentSession, settings.locale)
      : []
  const settingsFormValues = buildSettingsFormValues(settings)
  const breakCountdownSeconds = currentSession?.activeBreak
    ? Math.max(0, Math.ceil((currentSession.activeBreak.endsAtMs - nowMs) / 1000))
    : 0
  const nextBreakLabel = currentSession?.activeBreak
    ? `${formatBreakKind(currentSession.activeBreak.kind)} now`
    : nextBreakHint
      ? `${formatBreakKind(nextBreakHint.kind)} at page ${nextBreakHint.triggerPage}`
      : 'No break scheduled'
  const estimatedToBreakLabel = currentSession?.activeBreak
    ? 'Now'
    : nextBreakHint
      ? `~${formatClockDuration(
          nextBreakHint.pagesUntilBreak * (settings.paceSecondsPerTwoPages / 2),
        )}`
      : '--'

  useEffect(() => {
    repository.saveTimerSettings(settings)
  }, [repository, settings])

  useEffect(() => {
    repository.saveSessionHistory(historyEntries)
  }, [historyEntries, repository])

  useEffect(() => {
    if (settings.resumeOnReopen) {
      repository.saveActiveSession(currentSession)
      return
    }

    repository.saveActiveSession(null)
  }, [currentSession, repository, settings.resumeOnReopen])

  useEffect(() => {
    if (!currentSession || currentSession.status === 'idle') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentSession])

  useEffect(() => {
    if (!currentSession?.activeBreak) {
      return
    }

    if (lastBreakPromptRef.current === currentSession.activeBreak.startedAtMs) {
      return
    }

    lastBreakPromptRef.current = currentSession.activeBreak.startedAtMs

    if (settings.softChimeEnabled) {
      void playSoftChime()
    }
  }, [currentSession?.activeBreak, settings.softChimeEnabled])

  function handleStartSession() {
    setActiveSession(startSession(Date.now()))
    setSurface('session')
    setNowMs(Date.now())
    setLiveAnnouncement('Session started.')
  }

  function handleAddPages(pages: number) {
    if (!currentSession) {
      return
    }

    setActiveSession(addPages(currentSession, pages, settings, Date.now()))
  }

  function handleUndo() {
    if (!currentSession) {
      return
    }

    setActiveSession(undoLastPages(currentSession, settings, Date.now()))
    setLiveAnnouncement('Undid the last page mark.')
  }

  function handlePauseToggle() {
    if (!currentSession) {
      return
    }

    if (currentSession.status === 'paused') {
      setActiveSession(resumeSession(currentSession, settings, Date.now()))
      setLiveAnnouncement('Session resumed.')
      return
    }

    setActiveSession(pauseSession(currentSession, Date.now()))
    setLiveAnnouncement('Session paused.')
  }

  function handleResumeFromBreak() {
    if (!currentSession) {
      return
    }

    setActiveSession(resumeSession(currentSession, settings, Date.now()))
    setLiveAnnouncement('Break completed.')
  }

  function handleSnoozeBreak() {
    if (!currentSession) {
      return
    }

    setActiveSession(snoozeBreak(currentSession, 30, Date.now()))
    setLiveAnnouncement('Break snoozed for 30 seconds.')
  }

  function handleSkipBreak() {
    if (!currentSession) {
      return
    }

    setActiveSession(skipBreak(currentSession, settings, Date.now()))
    setLiveAnnouncement('Break skipped once.')
  }

  function handleEndSession() {
    if (!currentSession) {
      return
    }

    const result = endSession(currentSession, Date.now())
    if (result.historyEntry) {
      setHistoryEntries((entries) => [result.historyEntry as SessionHistoryEntry, ...entries])
    }
    setActiveSession(null)
    setSurface('history')
    setLiveAnnouncement('Session saved to history.')
  }

  function handleResumeSavedSession() {
    if (!pendingResumeSession) {
      return
    }

    setActiveSession(pendingResumeSession)
    setPendingResumeSession(null)
    setSurface('session')
    setNowMs(Date.now())
    setLiveAnnouncement('Saved session resumed.')
  }

  function handleDiscardSavedSession() {
    repository.saveActiveSession(null)
    setPendingResumeSession(null)
    setLiveAnnouncement('Saved session discarded.')
  }

  function handleSettingsChange(nextValues: SettingsFormValues) {
    setSettings({
      ...settings,
      updatedAtMs: Date.now(),
      paceSecondsPerTwoPages: Math.max(30, Math.trunc(nextValues.paceSecondsPerTwoPages)),
      breakTiers: buildBreakTiers(nextValues),
      softChimeEnabled: nextValues.softChime,
      reducedMotion: nextValues.reducedMotion,
      largeText: nextValues.largeText,
      highContrast: nextValues.highContrast,
      sepiaTheme: nextValues.sepiaTheme,
      resumeOnReopen: nextValues.resumeOnReopen,
    })
  }

  function handleResetSettings() {
    setSettings(createDefaultTimerSettings(Date.now()))
    setLiveAnnouncement('Settings reset to defaults.')
  }

  function handleResetHistory() {
    setHistoryEntries([])
    repository.resetHistory()
    setLiveAnnouncement('History cleared.')
  }

  const onGlobalKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (pendingResumeSession || isEditableTarget(event.target)) {
      return
    }

    const key = event.key.toLowerCase()

    if (surface !== 'session') {
      if (key === 'h') {
        setSurface('history')
      }
      return
    }

    if (!currentSession || currentSession.status === 'idle') {
      if (key === 's') {
        event.preventDefault()
        handleStartSession()
      }
      return
    }

    if (currentSession.status === 'break') {
      if (key === 'r') {
        event.preventDefault()
        handleResumeFromBreak()
      }

      if (key === 'k') {
        event.preventDefault()
        handleSkipBreak()
      }

      if (key === 'n') {
        event.preventDefault()
        handleSnoozeBreak()
      }
      return
    }

    switch (key) {
      case '1':
        event.preventDefault()
        handleAddPages(1)
        break
      case '2':
        event.preventDefault()
        handleAddPages(2)
        break
      case 'u':
        event.preventDefault()
        handleUndo()
        break
      case 'p':
        event.preventDefault()
        handlePauseToggle()
        break
      case 'x':
        event.preventDefault()
        handleEndSession()
        break
      default:
        break
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onGlobalKeyDown(event)
    }

    window.addEventListener('keydown', listener)
    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [])

  return (
    <div
      className="coach-shell"
      data-theme={getThemeMode(settings)}
      data-large-text={settings.largeText ? 'true' : 'false'}
      data-reduced-motion={settings.reducedMotion ? 'true' : 'false'}
    >
      <header className="coach-header">
        <p className="coach-kicker">Local-first pacing</p>
        <h1 className="coach-title">{strings.appTitle}</h1>
        <p className="coach-subtitle">
          A calm companion for Quran reading sessions that need page-based breaks,
          soft prompts, and quick recovery when focus gets heavy.
        </p>
        <p className="coach-subtitle">{buildSummaryLabel(currentSession, settings)}</p>
      </header>

      <SurfaceTabs active={surface} onSelect={setSurface} />

      {surface === 'session' ? (
        <SessionSurface
          canAddPage={currentSession?.status === 'reading'}
          canAddTwoPages={currentSession?.status === 'reading'}
          canEnd={Boolean(currentSession)}
          canPause={Boolean(
            currentSession &&
              currentSession.status !== 'idle' &&
              currentSession.status !== 'break',
          )}
          canStart={!currentSession || currentSession.status === 'idle'}
          canUndo={Boolean(currentSession && currentSession.pageEvents.length > 0)}
          estimatedToBreakLabel={estimatedToBreakLabel}
          keyboardHints={[
            { action: 'Start session', keyLabel: 'S' },
            { action: 'Add one page', keyLabel: '1' },
            { action: 'Add two pages', keyLabel: '2' },
            { action: 'Undo last change', keyLabel: 'U' },
            { action: 'Pause or resume', keyLabel: 'P' },
            { action: 'End session', keyLabel: 'X' },
          ]}
          nextBreakLabel={nextBreakLabel}
          onAddPage={() => handleAddPages(1)}
          onAddTwoPages={() => handleAddPages(2)}
          onEndSession={handleEndSession}
          onPauseToggle={handlePauseToggle}
          onStartSession={handleStartSession}
          onUndo={handleUndo}
          paceHint={hybridNudge?.message ?? null}
          pageCount={currentSession?.totalPages ?? 0}
          pauseLabel={currentSession?.status === 'paused' ? 'Resume' : 'Pause'}
          status={(currentSession?.status ?? 'idle') as 'idle' | 'reading' | 'paused' | 'break'}
          statusLabel={getStatusLabel(currentSession)}
          timeline={timeline}
        />
      ) : null}

      {surface === 'history' ? (
        <HistorySurface entries={historyView} onResetHistory={handleResetHistory} />
      ) : null}

      {surface === 'settings' ? (
        <SettingsSurface
          onChange={handleSettingsChange}
          onResetSettings={handleResetSettings}
          values={settingsFormValues}
        />
      ) : null}

      <BreakOverlay
        breakReason={
          currentSession?.activeBreak
            ? `Page ${currentSession.activeBreak.triggerPage} reached. Use the countdown for a gentle reset.`
            : ''
        }
        breakTitle={
          currentSession?.activeBreak
            ? formatBreakKind(currentSession.activeBreak.kind)
            : ''
        }
        countdownSeconds={breakCountdownSeconds}
        isOpen={Boolean(currentSession?.activeBreak)}
        onResumeNow={handleResumeFromBreak}
        onSkipOnce={handleSkipBreak}
        onSnooze={handleSnoozeBreak}
        suggestion={
          currentSession?.activeBreak
            ? BREAK_SUGGESTIONS[currentSession.activeBreak.kind]
            : ''
        }
      />

      {pendingResumeSession ? (
        <div className="break-overlay-backdrop">
          <section
            className="break-overlay resume-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-session-title"
          >
            <p className="surface-eyebrow">Saved locally</p>
            <h2 id="resume-session-title" className="break-title">
              Resume your last session?
            </h2>
            <p className="break-reason">
              The previous session is still saved on this device. You can resume it or
              discard it and start fresh.
            </p>
            <div className="resume-grid">
              <div className="metric-card">
                <p className="metric-label">Pages logged</p>
                <p className="metric-value">{pendingResumeSession.totalPages}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Status</p>
                <p className="metric-value">{getStatusLabel(pendingResumeSession)}</p>
              </div>
            </div>
            <div className="break-actions">
              <button
                type="button"
                className="action-btn action-btn-primary"
                onClick={handleResumeSavedSession}
              >
                Resume saved session
              </button>
              <button
                type="button"
                className="action-btn action-btn-soft"
                onClick={handleDiscardSavedSession}
              >
                Discard saved session
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </div>
    </div>
  )
}

export default App
