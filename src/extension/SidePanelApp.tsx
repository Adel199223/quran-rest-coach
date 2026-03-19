import { useEffect, useState } from 'react'
import { CoachDashboard } from '../app/CoachDashboard'
import {
  buildBreakTiers,
  buildCompletedSessionSummary,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextGoalLabel,
  buildNextBreakLabel,
  buildParkForLaterLabel,
  buildPaceHint,
  buildReadingPressureCue,
  buildReadingIntentOptions,
  buildResumeAnchorLabel,
  buildSettingsFormValues,
  buildStudyLaterEntries,
  buildSummaryLabel,
  buildTimeline,
  buildTrackingCopy,
  buildTrackingLabel,
  BREAK_SUGGESTIONS,
  createStudyLaterItem,
  getStatusLabel,
} from '../app/view-model'
import { useDeadlineWarningCue } from '../app/useDeadlineWarningCue'
import { usePendingStartCountdown } from '../app/usePendingStartCountdown'
import type { ReadingIntent, TimerSettings } from '../domain'
import { createDefaultTimerSettings } from '../domain/settings'
import { formatBreakKind } from '../lib/format'
import { LocalStorageRepository, type CoachSnapshot } from '../lib/storage'
import { getStrings } from '../lib/strings'
import { sendExtensionMessage } from './chromeApi'
import { ChromeStorageAdapter } from './chromeStorage'

const repository = new LocalStorageRepository(new ChromeStorageAdapter())

function createEmptySnapshot(): CoachSnapshot {
  return {
    settings: createDefaultTimerSettings(Date.now()),
    activeSession: null,
    historyEntries: [],
    readerContext: null,
    studyLaterItems: [],
  }
}

export function SidePanelApp() {
  const [snapshot, setSnapshot] = useState<CoachSnapshot>(createEmptySnapshot)
  const [selectedReadingIntent, setSelectedReadingIntent] = useState<ReadingIntent>('flow')
  const [surface, setSurface] = useState<'session' | 'history' | 'settings'>('session')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [completedSessionSummary, setCompletedSessionSummary] = useState(() =>
    buildCompletedSessionSummary(null),
  )
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [portabilityMessage, setPortabilityMessage] = useState<string | null>(null)
  const [portabilityBusy, setPortabilityBusy] = useState(false)
  const {
    pendingStart,
    pendingStartView,
    beginPendingStart,
    cancelPendingStart,
    startNow,
  } = usePendingStartCountdown({
    durationSeconds: snapshot.settings.preStartCountdownSeconds,
    warningCueEnabled: snapshot.settings.preStartWarningCueEnabled,
    onAnnounce: setLiveAnnouncement,
    onStart: (intent) => {
      setCompletedSessionSummary(null)
      void runCommand({ type: 'start-session', intent }, 'Session started.')
    },
  })

  useEffect(() => {
    let cancelled = false

    const syncSnapshot = async () => {
      const next = await repository.loadSnapshot()
      if (!cancelled) {
        setSnapshot(next)
      }
    }

    void syncSnapshot()
    const unsubscribe = repository.subscribe(() => {
      void syncSnapshot()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (snapshot.activeSession) {
      setSelectedReadingIntent(snapshot.activeSession.readingIntent)
    }
  }, [snapshot.activeSession])

  useEffect(() => {
    void sendExtensionMessage({
      kind: 'session-command',
      command: { type: 'set-side-panel-visibility', open: true },
    })

    return () => {
      void sendExtensionMessage({
        kind: 'session-command',
        command: { type: 'set-side-panel-visibility', open: false },
      })
    }
  }, [])

  useEffect(() => {
    if ((!snapshot.activeSession || snapshot.activeSession.status === 'idle') && !pendingStart) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
      if (snapshot.activeSession) {
        void runCommand({ type: 'tick-session' })
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [pendingStart, snapshot.activeSession])

  async function runCommand(
    command: import('./messages').SessionCommand,
    successMessage?: string,
  ) {
    const result = await sendExtensionMessage({
      kind: 'session-command',
      command,
    })

    if (!result.ok) {
      setLiveAnnouncement(result.error ?? 'Extension command failed.')
      return result
    }

    if (successMessage) {
      setLiveAnnouncement(successMessage)
    }

    return result
  }

  async function handleExportData() {
    setPortabilityBusy(true)
    try {
      const result = await runCommand({ type: 'export-data' })
      if (!result?.ok || !result.exportData) {
        return
      }

      const blob = new Blob([JSON.stringify(result.exportData, null, 2)], {
        type: 'application/json',
      })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = 'quran-rest-coach-export.json'
      link.click()
      URL.revokeObjectURL(objectUrl)
      setPortabilityMessage('Exported extension data successfully.')
    } finally {
      setPortabilityBusy(false)
    }
  }

  async function handleImportData(file: File) {
    setPortabilityBusy(true)
    try {
      const payload = await file.text()
      const result = await runCommand({ type: 'import-data', payload })
      if (result?.ok) {
        setPortabilityMessage('Imported data into the extension successfully.')
      }
    } finally {
      setPortabilityBusy(false)
    }
  }

  const settings = snapshot.settings
  const activeSession = snapshot.activeSession
  const readerContext = snapshot.readerContext
  const historyEntries = snapshot.historyEntries
  const studyLaterItems = snapshot.studyLaterItems
  const strings = getStrings(settings.locale)
  const timeline =
    activeSession && activeSession.status !== 'idle'
      ? buildTimeline(activeSession, settings.locale)
      : []
  const historyView = buildHistoryEntries(historyEntries, settings.locale)
  const studyLaterView = buildStudyLaterEntries(studyLaterItems, settings.locale)
  const settingsValues = buildSettingsFormValues(settings)
  const readingIntent = activeSession?.readingIntent ?? selectedReadingIntent
  const readingIntentOptions = buildReadingIntentOptions()
  const resumeAnchorLabel = buildResumeAnchorLabel(activeSession, readerContext)
  const nextGoalLabel = buildNextGoalLabel(readingIntent)
  const parkForLaterLabel = buildParkForLaterLabel(readerContext)
  const readingPressureCue = buildReadingPressureCue(activeSession, settings, nowMs)
  useDeadlineWarningCue({
    cue: readingPressureCue,
    enabled: settings.deadlineWarningCueEnabled,
  })

  async function handleParkForLater() {
    const item = createStudyLaterItem(readerContext, activeSession, Date.now())
    if (!item) {
      return
    }

    await repository.appendStudyLaterItem(item)
    setSurface('history')
    setLiveAnnouncement('Saved the current verse for later.')
  }

  async function handleRemoveStudyLater(itemId: string) {
    await repository.removeStudyLaterItem(itemId)
    setLiveAnnouncement('Removed a saved verse from the later list.')
  }

  function handleSurfaceChange(nextSurface: 'session' | 'history' | 'settings') {
    if (nextSurface !== 'session') {
      cancelPendingStart()
    }

    setSurface(nextSurface)
  }

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
          ? `You reached page ${activeSession.activeBreak.triggerPage} on Quran.com. Take a short break before continuing.`
          : ''
      }
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
      estimatedToBreakLabel={buildEstimatedToBreakLabel(activeSession, settings, nowMs)}
      historyEntries={historyView}
      studyLaterItems={studyLaterView}
      liveAnnouncement={liveAnnouncement}
      mode="extension"
      nextBreakLabel={buildNextBreakLabel(activeSession, settings)}
      nextGoalLabel={nextGoalLabel}
      readingPressureCue={readingPressureCue}
      onAddPage={() => void runCommand({ type: 'add-pages', pages: 1 })}
      onAddTwoPages={() => void runCommand({ type: 'add-pages', pages: 2 })}
      onEndSession={() => {
        void (async () => {
          const result = await runCommand({ type: 'end-session' }, 'Session complete.')
          if (result?.ok) {
            setCompletedSessionSummary(buildCompletedSessionSummary(result.historyEntry ?? null))
            setSurface('session')
          }
        })()
      }}
      onExportData={() => void handleExportData()}
      onImportData={(file) => void handleImportData(file)}
      onParkForLater={() => void handleParkForLater()}
      onPauseToggle={() => {
        void runCommand(
          { type: 'toggle-pause' },
          activeSession?.status === 'paused' ? 'Session resumed.' : 'Session paused.',
        )
      }}
      onRemoveStudyLater={(itemId) => void handleRemoveStudyLater(itemId)}
      onResetHistory={() => void runCommand({ type: 'reset-history' }, 'History cleared.')}
      onResetSettings={() => void runCommand({ type: 'reset-settings' }, 'Settings reset.')}
      onResumeNow={() => void runCommand({ type: 'resume-break' }, 'Break completed.')}
      onSelectReadingIntent={setSelectedReadingIntent}
      onSettingsChange={(values) => {
        const nextSettings: TimerSettings = {
          ...settings,
          updatedAtMs: Date.now(),
          paceSecondsPerTwoPages: Math.max(30, Math.trunc(values.paceSecondsPerTwoPages)),
          breakTiers: buildBreakTiers(values),
          showBetweenBreakCountdown: values.showBetweenBreakCountdown,
          readingPressureMode: values.readingPressureMode,
          deadlineWarningCueEnabled: values.deadlineWarningCueEnabled,
          showRestCountdown: values.showRestCountdown,
          softChimeEnabled: values.softChime,
          preStartCountdownSeconds: values.preStartCountdownSeconds,
          preStartWarningCueEnabled: values.preStartWarningCueEnabled,
          simplifiedReadingPanel: values.simplifiedReadingPanel,
          reducedMotion: values.reducedMotion,
          largeText: values.largeText,
          highContrast: values.highContrast,
          sepiaTheme: values.sepiaTheme,
          resumeOnReopen: values.resumeOnReopen,
        }

        void runCommand({ type: 'update-settings', settings: nextSettings })
      }}
      onSkipBreak={() => void runCommand({ type: 'skip-break' }, 'Break skipped once.')}
      onSnoozeDeadline={() =>
        void runCommand({ type: 'snooze-reading-deadline' }, 'Added 10 seconds to the current deadline.')
      }
      onSnoozeBreak={() => void runCommand({ type: 'snooze-break', seconds: 30 })}
      onStartNow={startNow}
      onStartSession={() => {
        setCompletedSessionSummary(null)
        beginPendingStart(selectedReadingIntent)
      }}
      onCancelPendingStart={cancelPendingStart}
      onSurfaceChange={handleSurfaceChange}
      onUndo={() => void runCommand({ type: 'undo-last-pages' }, 'Undid the last page mark.')}
      onViewHistory={() => handleSurfaceChange('history')}
      pageCount={activeSession?.totalPages ?? 0}
      paceScore={activeSession?.pressureModeEnabled ? activeSession.paceScore : null}
      paceHint={buildPaceHint(activeSession, settings, nowMs)}
      pauseLabel={activeSession?.status === 'paused' ? 'Resume' : 'Pause'}
      parkForLaterLabel={parkForLaterLabel}
      parkedCount={studyLaterItems.length}
      pendingStart={pendingStartView}
      portabilityBusy={portabilityBusy}
      portabilityMessage={portabilityMessage}
      readingIntent={readingIntent}
      readingIntentOptions={readingIntentOptions}
      readerContext={readerContext}
      resumeAnchorLabel={resumeAnchorLabel}
      settings={settings}
      settingsValues={settingsValues}
      status={(activeSession?.status ?? 'idle') as 'idle' | 'reading' | 'paused' | 'break'}
      statusLabel={getStatusLabel(activeSession)}
      summaryLabel={buildSummaryLabel(activeSession, settings)}
      surface={surface}
      timeline={timeline}
      trackingCopy={buildTrackingCopy(readerContext)}
      trackingLabel={buildTrackingLabel(readerContext)}
    />
  )
}
