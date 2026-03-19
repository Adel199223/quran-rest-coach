import { useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import {
  type ActiveSession,
  type ReadingIntent,
  type SessionHistoryEntry,
  type StudyLaterItem,
  type TimerSettings,
} from './domain'
import {
  buildCompletedSessionSummary,
  buildBreakTiers,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextGoalLabel,
  buildNextBreakLabel,
  buildPaceHint,
  buildParkForLaterLabel,
  buildReadingPressureCue,
  buildReadingIntentOptions,
  buildResetSettings,
  buildResumeAnchorLabel,
  buildSettingsFormValues,
  buildStudyLaterEntries,
  buildSummaryLabel,
  buildTimeline,
  BREAK_SUGGESTIONS,
  createStudyLaterItem,
  getReadingIntentLabel,
  getStatusLabel,
} from './app/view-model'
import { useDeadlineWarningCue } from './app/useDeadlineWarningCue'
import { usePendingStartCountdown } from './app/usePendingStartCountdown'
import { CoachDashboard } from './app/CoachDashboard'
import { getReviewScenarioIdFromSearch } from './app/reviewScenarioData'
import { ReviewScenarioApp } from './app/reviewScenarios'
import {
  addPages,
  advanceSessionTimers,
  endSession,
  pauseSession,
  resumeSession,
  skipBreak,
  snoozeBreak,
  snoozeReadingDeadline,
  startSession,
  undoLastPages,
} from './domain'
import { playSoftChime } from './lib/audio'
import { formatBreakKind } from './lib/format'
import { createLocalStorageRepository } from './lib/storage'
import { getStrings } from './lib/strings'

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

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

function LiveApp() {
  const [repository] = useState(() => createLocalStorageRepository())
  const [hydrated, setHydrated] = useState(false)
  const [settings, setSettings] = useState<TimerSettings>(() => buildResetSettings())
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [pendingResumeSession, setPendingResumeSession] = useState<ActiveSession | null>(null)
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>([])
  const [studyLaterItems, setStudyLaterItems] = useState<StudyLaterItem[]>([])
  const [selectedReadingIntent, setSelectedReadingIntent] = useState<ReadingIntent>('flow')
  const [surface, setSurface] = useState<'session' | 'history' | 'settings'>('session')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [completedSessionSummary, setCompletedSessionSummary] = useState(() =>
    buildCompletedSessionSummary(null),
  )
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [portabilityMessage, setPortabilityMessage] = useState<string | null>(null)
  const [portabilityBusy, setPortabilityBusy] = useState(false)
  const lastBreakPromptRef = useRef<number | null>(null)
  const readingIntentOptions = buildReadingIntentOptions()
  const {
    pendingStart,
    pendingStartView,
    beginPendingStart,
    cancelPendingStart,
    startNow,
  } = usePendingStartCountdown({
    durationSeconds: settings.preStartCountdownSeconds,
    warningCueEnabled: settings.preStartWarningCueEnabled,
    onAnnounce: setLiveAnnouncement,
    onStart: (intent, startedAtMs) => {
      setActiveSession(startSession(startedAtMs, intent, settings))
      setCompletedSessionSummary(null)
      setSelectedReadingIntent(intent)
      setSurface('session')
      setNowMs(startedAtMs)
      setLiveAnnouncement(`Session started with ${getReadingIntentLabel(intent)} intent.`)
    },
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const snapshot = await repository.loadSnapshot()
      if (cancelled) {
        return
      }

      setSettings(snapshot.settings)
      setPendingResumeSession(snapshot.activeSession)
      setHistoryEntries(snapshot.historyEntries)
      setStudyLaterItems(snapshot.studyLaterItems)
      setHydrated(true)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [repository])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void repository.saveTimerSettings(settings)
  }, [hydrated, repository, settings])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void repository.saveSessionHistory(historyEntries)
  }, [hydrated, historyEntries, repository])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void repository.saveStudyLaterItems(studyLaterItems)
  }, [hydrated, repository, studyLaterItems])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    if (settings.resumeOnReopen) {
      void repository.saveActiveSession(activeSession)
      return
    }

    void repository.saveActiveSession(null)
  }, [activeSession, hydrated, repository, settings.resumeOnReopen])

  useEffect(() => {
    if (!activeSession || activeSession.status === 'idle') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      const tickNowMs = Date.now()
      setNowMs(tickNowMs)
      setActiveSession((currentSession) =>
        currentSession ? advanceSessionTimers(currentSession, settings, tickNowMs) : currentSession,
      )
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSession, settings])

  useEffect(() => {
    if (!activeSession?.activeBreak) {
      return
    }

    if (lastBreakPromptRef.current === activeSession.activeBreak.startedAtMs) {
      return
    }

    lastBreakPromptRef.current = activeSession.activeBreak.startedAtMs
    if (settings.softChimeEnabled) {
      void playSoftChime()
    }
  }, [activeSession?.activeBreak, settings.softChimeEnabled])

  const strings = getStrings(settings.locale)
  const timeline =
    activeSession && activeSession.status !== 'idle'
      ? buildTimeline(activeSession, settings.locale)
      : []
  const historyView = buildHistoryEntries(historyEntries, settings.locale)
  const studyLaterView = buildStudyLaterEntries(studyLaterItems, settings.locale)
  const settingsValues = buildSettingsFormValues(settings)
  const statusLabel = getStatusLabel(activeSession)
  const nextBreakLabel = buildNextBreakLabel(activeSession, settings)
  const estimatedToBreakLabel = buildEstimatedToBreakLabel(activeSession, settings, nowMs)
  const readingPressureCue = buildReadingPressureCue(activeSession, settings, nowMs)
  const paceHint = buildPaceHint(activeSession, settings, nowMs)
  const readingIntent = activeSession?.readingIntent ?? selectedReadingIntent
  const resumeAnchorLabel = buildResumeAnchorLabel(activeSession, null)
  const nextGoalLabel = buildNextGoalLabel(readingIntent)
  useDeadlineWarningCue({
    cue: readingPressureCue,
    enabled: settings.deadlineWarningCueEnabled,
  })

  function handleStartSession() {
    setCompletedSessionSummary(null)
    beginPendingStart(selectedReadingIntent)
  }

  function handleAddPages(pages: number) {
    if (!activeSession) {
      return
    }

    setActiveSession(addPages(activeSession, pages, settings, Date.now()))
  }

  function handleUndo() {
    if (!activeSession) {
      return
    }

    setActiveSession(undoLastPages(activeSession, settings, Date.now()))
    setLiveAnnouncement('Undid the last page mark.')
  }

  function handlePauseToggle() {
    if (!activeSession) {
      return
    }

    if (activeSession.status === 'paused') {
      setActiveSession(resumeSession(activeSession, settings, Date.now()))
      setLiveAnnouncement('Session resumed.')
      return
    }

    setActiveSession(pauseSession(activeSession, Date.now()))
    setLiveAnnouncement('Session paused.')
  }

  function handleResumeFromBreak() {
    if (!activeSession) {
      return
    }

    setActiveSession(resumeSession(activeSession, settings, Date.now()))
    setLiveAnnouncement('Break completed.')
  }

  function handleSnoozeBreak() {
    if (!activeSession) {
      return
    }

    setActiveSession(snoozeBreak(activeSession, 30, Date.now()))
    setLiveAnnouncement('Break snoozed for 30 seconds.')
  }

  function handleSkipBreak() {
    if (!activeSession) {
      return
    }

    setActiveSession(skipBreak(activeSession, settings, Date.now()))
    setLiveAnnouncement('Break skipped once.')
  }

  function handleEndSession() {
    if (!activeSession) {
      return
    }

    const result = endSession(activeSession, Date.now())
    if (result.historyEntry) {
      setHistoryEntries((entries) => [result.historyEntry as SessionHistoryEntry, ...entries])
      setCompletedSessionSummary(buildCompletedSessionSummary(result.historyEntry))
    } else {
      setCompletedSessionSummary(null)
    }

    setActiveSession(null)
    setSurface('session')
    setLiveAnnouncement('Session complete. Summary is ready.')
  }

  function handleResumeSavedSession() {
    if (!pendingResumeSession) {
      return
    }

    setActiveSession(pendingResumeSession)
    setCompletedSessionSummary(null)
    setSelectedReadingIntent(pendingResumeSession.readingIntent)
    setPendingResumeSession(null)
    setSurface('session')
    setNowMs(Date.now())
    setLiveAnnouncement('Saved session resumed.')
  }

  function handleDiscardSavedSession() {
    setPendingResumeSession(null)
    void repository.saveActiveSession(null)
    setLiveAnnouncement('Saved session discarded.')
  }

  function handleSurfaceChange(nextSurface: 'session' | 'history' | 'settings') {
    if (nextSurface !== 'session') {
      cancelPendingStart()
    }

    setSurface(nextSurface)
  }

  function handleSettingsChange(nextValues: typeof settingsValues) {
    setSettings({
      ...settings,
      updatedAtMs: Date.now(),
      paceSecondsPerTwoPages: Math.max(30, Math.trunc(nextValues.paceSecondsPerTwoPages)),
      breakTiers: buildBreakTiers(nextValues),
      showBetweenBreakCountdown: nextValues.showBetweenBreakCountdown,
      readingPressureMode: nextValues.readingPressureMode,
      deadlineWarningCueEnabled: nextValues.deadlineWarningCueEnabled,
      showRestCountdown: nextValues.showRestCountdown,
      softChimeEnabled: nextValues.softChime,
      preStartCountdownSeconds: nextValues.preStartCountdownSeconds,
      preStartWarningCueEnabled: nextValues.preStartWarningCueEnabled,
      simplifiedReadingPanel: nextValues.simplifiedReadingPanel,
      reducedMotion: nextValues.reducedMotion,
      largeText: nextValues.largeText,
      highContrast: nextValues.highContrast,
      sepiaTheme: nextValues.sepiaTheme,
      resumeOnReopen: nextValues.resumeOnReopen,
    })
  }

  function handleResetSettings() {
    setSettings(buildResetSettings(Date.now()))
    setLiveAnnouncement('Settings reset to defaults.')
  }

  function handleResetHistory() {
    setHistoryEntries([])
    void repository.resetHistory()
    setLiveAnnouncement('History cleared.')
  }

  function handleRemoveStudyLater(itemId: string) {
    setStudyLaterItems((items) => items.filter((item) => item.id !== itemId))
    setLiveAnnouncement('Removed a saved verse from the later list.')
  }

  function handleParkForLater() {
    const item = createStudyLaterItem(null, activeSession, Date.now())
    if (!item) {
      return
    }

    setStudyLaterItems((items) => [item, ...items.filter((entry) => entry.id !== item.id)])
    setSurface('history')
    setLiveAnnouncement('Saved the current verse for later.')
  }

  function handleSnoozeDeadline() {
    if (!activeSession) {
      return
    }

    setActiveSession(snoozeReadingDeadline(activeSession, Date.now()))
    setLiveAnnouncement('Added 10 seconds to the current deadline.')
  }

  async function handleExportData() {
    setPortabilityBusy(true)
    try {
      const payload = await repository.exportData()
      downloadJson('quran-rest-coach-export.json', payload)
      setPortabilityMessage('Exported your local Quran Rest Coach data.')
    } finally {
      setPortabilityBusy(false)
    }
  }

  async function handleImportData(file: File) {
    setPortabilityBusy(true)
    try {
      const contents = await file.text()
      await repository.importData(contents)
      const snapshot = await repository.loadSnapshot()
      setSettings(snapshot.settings)
      setActiveSession(null)
      setPendingResumeSession(snapshot.activeSession)
      setHistoryEntries(snapshot.historyEntries)
      setStudyLaterItems(snapshot.studyLaterItems)
      setPortabilityMessage('Imported data successfully.')
    } catch (error) {
      setPortabilityMessage(
        error instanceof Error ? error.message : 'Import failed. Please try another file.',
      )
    } finally {
      setPortabilityBusy(false)
    }
  }

  const onGlobalKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (pendingResumeSession || isEditableTarget(event.target)) {
      return
    }

    const key = event.key.toLowerCase()
    if (pendingStart) {
      if (key === 'escape') {
        event.preventDefault()
        cancelPendingStart()
      }

      if (key === 'enter') {
        event.preventDefault()
        startNow()
      }
      return
    }

    if (surface !== 'session') {
      if (key === 'h') {
        handleSurfaceChange('history')
      }
      return
    }

    if (!activeSession || activeSession.status === 'idle') {
      if (key === 's') {
        event.preventDefault()
        handleStartSession()
      }
      return
    }

    if (activeSession.status === 'break') {
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
    <CoachDashboard
      appTitle={strings.appTitle}
      breakCountdownSeconds={
        activeSession?.activeBreak
          ? Math.max(0, Math.ceil((activeSession.activeBreak.endsAtMs - nowMs) / 1000))
          : 0
      }
      breakShowCountdown={settings.showRestCountdown}
      breakOpen={Boolean(activeSession?.activeBreak)}
      breakReason={
        activeSession?.activeBreak
          ? `You reached page ${activeSession.activeBreak.triggerPage}. Take a short break before continuing.`
          : ''
      }
      breakSuggestion={
        activeSession?.activeBreak ? BREAK_SUGGESTIONS[activeSession.activeBreak.kind] : ''
      }
      breakTitle={activeSession?.activeBreak ? formatBreakKind(activeSession.activeBreak.kind) : ''}
      canAddPage={activeSession?.status === 'reading'}
      canAddTwoPages={activeSession?.status === 'reading'}
      canEnd={Boolean(activeSession)}
      canPause={Boolean(
        activeSession && activeSession.status !== 'idle' && activeSession.status !== 'break',
      )}
      canSnoozeDeadline={Boolean(readingPressureCue?.snoozeAvailable)}
      canStart={!activeSession || activeSession.status === 'idle'}
      canUndo={Boolean(activeSession && activeSession.pageEvents.length > 0)}
      completedSessionSummary={completedSessionSummary}
      currentPagesLate={activeSession?.currentPagesLate ?? 0}
      estimatedToBreakLabel={estimatedToBreakLabel}
      historyEntries={historyView}
      studyLaterItems={studyLaterView}
      liveAnnouncement={liveAnnouncement}
      mode="standalone"
      nextBreakLabel={nextBreakLabel}
      nextGoalLabel={nextGoalLabel}
      readingPressureCue={readingPressureCue}
      onAddPage={() => handleAddPages(1)}
      onAddTwoPages={() => handleAddPages(2)}
      onDiscardSavedSession={handleDiscardSavedSession}
      onEndSession={handleEndSession}
      onExportData={handleExportData}
      onImportData={handleImportData}
      onParkForLater={handleParkForLater}
      onPauseToggle={handlePauseToggle}
      onCancelPendingStart={cancelPendingStart}
      onRemoveStudyLater={handleRemoveStudyLater}
      onResetHistory={handleResetHistory}
      onResetSettings={handleResetSettings}
      onResumeNow={handleResumeFromBreak}
      onResumeSavedSession={handleResumeSavedSession}
      onSelectReadingIntent={setSelectedReadingIntent}
      onSettingsChange={handleSettingsChange}
      onSkipBreak={handleSkipBreak}
      onSnoozeDeadline={handleSnoozeDeadline}
      onSnoozeBreak={handleSnoozeBreak}
      onStartNow={startNow}
      onStartSession={handleStartSession}
      onSurfaceChange={handleSurfaceChange}
      onUndo={handleUndo}
      onViewHistory={() => handleSurfaceChange('history')}
      paceScore={activeSession?.pressureModeEnabled ? activeSession.paceScore : null}
      paceHint={paceHint}
      pageCount={activeSession?.totalPages ?? 0}
      pauseLabel={activeSession?.status === 'paused' ? 'Resume' : 'Pause'}
      parkForLaterLabel={buildParkForLaterLabel(null)}
      parkedCount={studyLaterItems.length}
      pendingResumeSession={pendingResumeSession}
      pendingStart={pendingStartView}
      portabilityBusy={portabilityBusy}
      portabilityMessage={portabilityMessage}
      readingIntent={readingIntent}
      readingIntentOptions={readingIntentOptions}
      readerContext={null}
      resumeAnchorLabel={resumeAnchorLabel}
      settings={settings}
      settingsValues={settingsValues}
      status={(activeSession?.status ?? 'idle') as 'idle' | 'reading' | 'paused' | 'break'}
      statusLabel={statusLabel}
      summaryLabel={buildSummaryLabel(activeSession, settings)}
      surface={surface}
      timeline={timeline}
      trackingCopy="Track pages and breaks here when you are not on Quran.com."
      trackingLabel="Local coach"
    />
  )
}

function App() {
  const reviewScenarioId =
    typeof window === 'undefined' ? null : getReviewScenarioIdFromSearch(window.location.search)

  if (reviewScenarioId) {
    return <ReviewScenarioApp scenarioId={reviewScenarioId} />
  }

  return <LiveApp />
}

export default App
