import { useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import { type ActiveSession, type SessionHistoryEntry, type TimerSettings } from './domain'
import {
  buildBreakTiers,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextBreakLabel,
  buildPaceHint,
  buildResetSettings,
  buildSettingsFormValues,
  buildSummaryLabel,
  buildTimeline,
  BREAK_SUGGESTIONS,
  getStatusLabel,
} from './app/view-model'
import { CoachDashboard } from './app/CoachDashboard'
import {
  addPages,
  endSession,
  pauseSession,
  resumeSession,
  skipBreak,
  snoozeBreak,
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

function App() {
  const [repository] = useState(() => createLocalStorageRepository())
  const [hydrated, setHydrated] = useState(false)
  const [settings, setSettings] = useState<TimerSettings>(() => buildResetSettings())
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [pendingResumeSession, setPendingResumeSession] = useState<ActiveSession | null>(null)
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>([])
  const [surface, setSurface] = useState<'session' | 'history' | 'settings'>('session')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [portabilityMessage, setPortabilityMessage] = useState<string | null>(null)
  const [portabilityBusy, setPortabilityBusy] = useState(false)
  const lastBreakPromptRef = useRef<number | null>(null)

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
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSession])

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
  const settingsValues = buildSettingsFormValues(settings)
  const statusLabel = getStatusLabel(activeSession)
  const nextBreakLabel = buildNextBreakLabel(activeSession, settings)
  const estimatedToBreakLabel = buildEstimatedToBreakLabel(activeSession, settings)
  const paceHint = buildPaceHint(activeSession, settings, nowMs)

  function handleStartSession() {
    setActiveSession(startSession(Date.now()))
    setSurface('session')
    setNowMs(Date.now())
    setLiveAnnouncement('Session started.')
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
    setPendingResumeSession(null)
    void repository.saveActiveSession(null)
    setLiveAnnouncement('Saved session discarded.')
  }

  function handleSettingsChange(nextValues: typeof settingsValues) {
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
    setSettings(buildResetSettings(Date.now()))
    setLiveAnnouncement('Settings reset to defaults.')
  }

  function handleResetHistory() {
    setHistoryEntries([])
    void repository.resetHistory()
    setLiveAnnouncement('History cleared.')
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
    if (surface !== 'session') {
      if (key === 'h') {
        setSurface('history')
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
      breakOpen={Boolean(activeSession?.activeBreak)}
      breakReason={
        activeSession?.activeBreak
          ? `Page ${activeSession.activeBreak.triggerPage} reached. Use the countdown for a gentle reset.`
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
      canStart={!activeSession || activeSession.status === 'idle'}
      canUndo={Boolean(activeSession && activeSession.pageEvents.length > 0)}
      estimatedToBreakLabel={estimatedToBreakLabel}
      historyEntries={historyView}
      liveAnnouncement={liveAnnouncement}
      mode="standalone"
      nextBreakLabel={nextBreakLabel}
      onAddPage={() => handleAddPages(1)}
      onAddTwoPages={() => handleAddPages(2)}
      onDiscardSavedSession={handleDiscardSavedSession}
      onEndSession={handleEndSession}
      onExportData={handleExportData}
      onImportData={handleImportData}
      onPauseToggle={handlePauseToggle}
      onResetHistory={handleResetHistory}
      onResetSettings={handleResetSettings}
      onResumeNow={handleResumeFromBreak}
      onResumeSavedSession={handleResumeSavedSession}
      onSettingsChange={handleSettingsChange}
      onSkipBreak={handleSkipBreak}
      onSnoozeBreak={handleSnoozeBreak}
      onStartSession={handleStartSession}
      onSurfaceChange={setSurface}
      onUndo={handleUndo}
      paceHint={paceHint}
      pageCount={activeSession?.totalPages ?? 0}
      pauseLabel={activeSession?.status === 'paused' ? 'Resume' : 'Pause'}
      pendingResumeSession={pendingResumeSession}
      portabilityBusy={portabilityBusy}
      portabilityMessage={portabilityMessage}
      readerContext={null}
      settings={settings}
      settingsValues={settingsValues}
      status={(activeSession?.status ?? 'idle') as 'idle' | 'reading' | 'paused' | 'break'}
      statusLabel={statusLabel}
      summaryLabel={buildSummaryLabel(activeSession, settings)}
      surface={surface}
      timeline={timeline}
      trackingCopy="Use the local coach to manage pacing outside the Quran.com extension flow."
      trackingLabel="Standalone mode"
    />
  )
}

export default App
