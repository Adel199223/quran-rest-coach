import { useEffect, useState } from 'react'
import {
  addPages,
  advanceSessionTimers,
  endSession,
  pauseSession,
  resumeSession,
  snoozeReadingDeadline,
  skipBreak,
  snoozeBreak,
  startSession,
  undoLastPages,
  type ActiveSession,
  type ReadingIntent,
  type SessionHistoryEntry,
  type StudyLaterItem,
  type TimerSettings,
} from '../domain'
import { CoachDashboard } from './CoachDashboard'
import {
  BREAK_SUGGESTIONS,
  buildCompletedSessionSummary,
  buildBreakTiers,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextGoalLabel,
  buildNextBreakLabel,
  buildParkForLaterLabel,
  buildPaceHint,
  buildReadingPressureCue,
  buildReadingIntentOptions,
  buildResetSettings,
  buildResumeAnchorLabel,
  buildSettingsFormValues,
  buildStudyLaterEntries,
  buildSummaryLabel,
  buildTimeline,
  buildTrackingCopy,
  buildTrackingLabel,
  createStudyLaterItem,
  getStatusLabel,
} from './view-model'
import { useDeadlineWarningCue } from './useDeadlineWarningCue'
import { usePendingStartCountdown } from './usePendingStartCountdown'
import { buildReviewScenarioSeed, REVIEW_NOW_MS, type ReviewScenarioId } from './reviewScenarioData'
import { formatBreakKind } from '../lib/format'
import { playSoftChime } from '../lib/audio'

const REVIEW_MESSAGE = 'Review mode: demo state only. Refresh to reset.'

function ReviewScenarioRuntime({
  scenarioId,
}: {
  scenarioId: ReviewScenarioId
}) {
  const seed = buildReviewScenarioSeed(scenarioId)
  const [settings, setSettings] = useState<TimerSettings>(seed.settings)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(seed.activeSession)
  const [pendingResumeSession, setPendingResumeSession] = useState<ActiveSession | null>(
    seed.pendingResumeSession,
  )
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>(seed.historyEntries)
  const [studyLaterItems, setStudyLaterItems] = useState<StudyLaterItem[]>(seed.studyLaterItems)
  const [selectedReadingIntent, setSelectedReadingIntent] = useState<ReadingIntent>(
    seed.selectedReadingIntent,
  )
  const [surface, setSurface] = useState(seed.surface)
  const [nowMs, setNowMs] = useState(REVIEW_NOW_MS)
  const [completedSessionSummary, setCompletedSessionSummary] = useState(() =>
    buildCompletedSessionSummary(null),
  )
  const [liveAnnouncement, setLiveAnnouncement] = useState(REVIEW_MESSAGE)
  const {
    pendingStartView,
    beginPendingStart,
    cancelPendingStart,
    startNow,
  } = usePendingStartCountdown({
    durationSeconds: settings.preStartCountdownSeconds,
    warningCueEnabled: settings.preStartWarningCueEnabled,
    initialPendingStart: seed.pendingStart,
    initialNowMs: REVIEW_NOW_MS,
    onAnnounce: setLiveAnnouncement,
    onStart: (intent, startedAtMs) => {
      setActiveSession(startSession(startedAtMs, intent, settings))
      setCompletedSessionSummary(null)
      setSelectedReadingIntent(intent)
      setSurface('session')
      setLiveAnnouncement('Review session started.')
    },
  })

  useEffect(() => {
    if (!activeSession || activeSession.status === 'idle') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs((previousNowMs) => {
        const nextNowMs = previousNowMs + 1_000
        setActiveSession((currentSession) =>
          currentSession ? advanceSessionTimers(currentSession, settings, nextNowMs) : currentSession,
        )
        return nextNowMs
      })
    }, 1_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeSession, settings])

  const timeline =
    activeSession && activeSession.status !== 'idle' ? buildTimeline(activeSession, settings.locale) : []
  const historyView = buildHistoryEntries(historyEntries, settings.locale)
  const studyLaterView = buildStudyLaterEntries(studyLaterItems, settings.locale)
  const settingsValues = buildSettingsFormValues(settings)
  const statusLabel = getStatusLabel(activeSession)
  const nextBreakLabel = buildNextBreakLabel(activeSession, settings)
  const estimatedToBreakLabel = buildEstimatedToBreakLabel(activeSession, settings, nowMs)
  const readingPressureCue = buildReadingPressureCue(activeSession, settings, nowMs)
  const paceHint = buildPaceHint(activeSession, settings, nowMs)
  const readingIntent = activeSession?.readingIntent ?? selectedReadingIntent
  const readingIntentOptions = buildReadingIntentOptions()
  const resumeAnchorLabel = buildResumeAnchorLabel(activeSession, seed.readerContext)
  const nextGoalLabel = buildNextGoalLabel(readingIntent)
  const parkForLaterLabel = buildParkForLaterLabel(seed.readerContext)
  const activeBreakStartedAtMs = activeSession?.activeBreak?.startedAtMs ?? null
  useDeadlineWarningCue({
    cue: readingPressureCue,
    enabled: settings.deadlineWarningCueEnabled,
  })

  useEffect(() => {
    if (activeBreakStartedAtMs === null || !settings.softChimeEnabled) {
      return
    }

    void playSoftChime().catch(() => {})
  }, [activeBreakStartedAtMs, settings.softChimeEnabled])

  function handleStartSession() {
    setCompletedSessionSummary(null)
    beginPendingStart(selectedReadingIntent)
  }

  function handleAddPages(pages: number) {
    if (!activeSession) {
      return
    }

    setActiveSession(addPages(activeSession, pages, settings, nowMs))
    setLiveAnnouncement(`Logged ${pages} page${pages === 1 ? '' : 's'} in review mode.`)
  }

  function handleUndo() {
    if (!activeSession) {
      return
    }

    setActiveSession(undoLastPages(activeSession, settings, nowMs))
    setLiveAnnouncement('Undid the last page mark in review mode.')
  }

  function handlePauseToggle() {
    if (!activeSession) {
      return
    }

    if (activeSession.status === 'paused') {
      setActiveSession(resumeSession(activeSession, settings, nowMs))
      setLiveAnnouncement('Review session resumed.')
      return
    }

    setActiveSession(pauseSession(activeSession, nowMs))
    setLiveAnnouncement('Review session paused.')
  }

  function handleResumeNow() {
    if (!activeSession) {
      return
    }

    setActiveSession(resumeSession(activeSession, settings, nowMs))
    setLiveAnnouncement('Break completed in review mode.')
  }

  function handleSnoozeBreak() {
    if (!activeSession) {
      return
    }

    setActiveSession(snoozeBreak(activeSession, 30, nowMs))
    setLiveAnnouncement('Break snoozed for 30 seconds in review mode.')
  }

  function handleSkipBreak() {
    if (!activeSession) {
      return
    }

    setActiveSession(skipBreak(activeSession, settings, nowMs))
    setLiveAnnouncement('Break skipped once in review mode.')
  }

  function handleEndSession() {
    if (!activeSession) {
      return
    }

    const result = endSession(activeSession, nowMs)
    if (result.historyEntry) {
      setHistoryEntries((entries) => [result.historyEntry as SessionHistoryEntry, ...entries])
      setCompletedSessionSummary(buildCompletedSessionSummary(result.historyEntry))
    } else {
      setCompletedSessionSummary(null)
    }

    setActiveSession(null)
    setSurface('session')
    setLiveAnnouncement('Review session complete.')
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
    setLiveAnnouncement('Saved review session resumed.')
  }

  function handleDiscardSavedSession() {
    setPendingResumeSession(null)
    setLiveAnnouncement('Saved review session discarded.')
  }

  function handleSettingsChange(nextValues: typeof settingsValues) {
    setSettings({
      ...settings,
      updatedAtMs: nowMs,
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
    setLiveAnnouncement('Review settings updated.')
  }

  function handleSurfaceChange(nextSurface: 'session' | 'history' | 'settings') {
    if (nextSurface !== 'session') {
      cancelPendingStart()
    }

    setSurface(nextSurface)
  }

  function handleResetSettings() {
    setSettings(buildResetSettings(nowMs))
    setLiveAnnouncement('Review settings reset.')
  }

  function handleResetHistory() {
    setHistoryEntries([])
    setLiveAnnouncement('Review history cleared.')
  }

  function handleParkForLater() {
    const item = createStudyLaterItem(seed.readerContext, activeSession, nowMs)
    if (!item) {
      return
    }

    setStudyLaterItems((items) => [item, ...items.filter((entry) => entry.id !== item.id)])
    setSurface('history')
    setLiveAnnouncement('Saved the current verse for later in review mode.')
  }

  function handleSnoozeDeadline() {
    if (!activeSession) {
      return
    }

    setActiveSession(snoozeReadingDeadline(activeSession, nowMs))
    setLiveAnnouncement('Added 10 seconds to the current deadline in review mode.')
  }

  function handleRemoveStudyLater(itemId: string) {
    setStudyLaterItems((items) => items.filter((item) => item.id !== itemId))
    setLiveAnnouncement('Removed a saved verse from the later list in review mode.')
  }

  return (
    <div
      className="review-shell"
      data-review-scenario={scenarioId}
      data-review-width={seed.reviewWidth}
    >
      <p className="review-banner" role="status">
        {REVIEW_MESSAGE}
      </p>
      <CoachDashboard
        appTitle="Quran Rest Coach"
        breakCountdownSeconds={
          activeSession?.activeBreak
            ? Math.max(0, Math.ceil((activeSession.activeBreak.endsAtMs - nowMs) / 1000))
            : 0
        }
        breakDefaultMoreOptionsOpen={seed.breakDefaultMoreOptionsOpen}
        breakOpen={Boolean(activeSession?.activeBreak)}
        breakReason={
          activeSession?.activeBreak
            ? seed.mode === 'extension'
              ? `You reached page ${activeSession.activeBreak.triggerPage} on Quran.com. Take a short break before continuing.`
              : `You reached page ${activeSession.activeBreak.triggerPage}. Take a short break before continuing.`
            : ''
        }
        breakShowCountdown={settings.showRestCountdown}
        breakSuggestion={
          activeSession?.activeBreak ? BREAK_SUGGESTIONS[activeSession.activeBreak.kind] : ''
        }
        breakTitle={activeSession?.activeBreak ? formatBreakKind(activeSession.activeBreak.kind) : ''}
        canAddPage={Boolean(activeSession && activeSession.status === 'reading')}
        canAddTwoPages={Boolean(activeSession && activeSession.status === 'reading')}
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
        mode={seed.mode}
        nextBreakLabel={nextBreakLabel}
        nextGoalLabel={nextGoalLabel}
        readingPressureCue={readingPressureCue}
        onAddPage={() => handleAddPages(1)}
        onAddTwoPages={() => handleAddPages(2)}
        onDiscardSavedSession={handleDiscardSavedSession}
        onEndSession={handleEndSession}
        onExportData={() => setLiveAnnouncement('Data export is unavailable in review mode.')}
        onImportData={() => setLiveAnnouncement('Data import is unavailable in review mode.')}
        onParkForLater={handleParkForLater}
        onPauseToggle={handlePauseToggle}
        onCancelPendingStart={cancelPendingStart}
        onRemoveStudyLater={handleRemoveStudyLater}
        onResetHistory={handleResetHistory}
        onResetSettings={handleResetSettings}
        onResumeNow={handleResumeNow}
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
        parkForLaterLabel={parkForLaterLabel}
        parkedCount={studyLaterItems.length}
        pendingResumeSession={pendingResumeSession}
        pendingStart={pendingStartView}
        portabilityBusy={false}
        portabilityMessage={null}
        readingIntent={readingIntent}
        readingIntentOptions={readingIntentOptions}
        readerContext={seed.readerContext}
        resumeAnchorLabel={resumeAnchorLabel}
        settings={settings}
        settingsAdvancedTimingOpen={seed.settingsAdvancedTimingOpen}
        settingsValues={settingsValues}
        showDataTransfer={false}
        status={(activeSession?.status ?? 'idle') as 'idle' | 'reading' | 'paused' | 'break'}
        statusLabel={statusLabel}
        summaryLabel={buildSummaryLabel(activeSession, settings)}
        surface={surface}
        timeline={timeline}
        trackingCopy={buildTrackingCopy(seed.readerContext)}
        trackingLabel={buildTrackingLabel(seed.readerContext)}
      />
    </div>
  )
}

export function ReviewScenarioApp({ scenarioId }: { scenarioId: ReviewScenarioId }) {
  return <ReviewScenarioRuntime key={scenarioId} scenarioId={scenarioId} />
}
