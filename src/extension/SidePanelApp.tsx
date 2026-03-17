import { useEffect, useState } from 'react'
import { CoachDashboard } from '../app/CoachDashboard'
import {
  buildBreakTiers,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextBreakLabel,
  buildPaceHint,
  buildSettingsFormValues,
  buildSummaryLabel,
  buildTimeline,
  buildTrackingCopy,
  buildTrackingLabel,
  BREAK_SUGGESTIONS,
  getStatusLabel,
} from '../app/view-model'
import type { TimerSettings } from '../domain'
import { formatBreakKind } from '../lib/format'
import { LocalStorageRepository, type CoachSnapshot } from '../lib/storage'
import { getStrings } from '../lib/strings'
import { sendExtensionMessage } from './chromeApi'
import { ChromeStorageAdapter } from './chromeStorage'

const repository = new LocalStorageRepository(new ChromeStorageAdapter())

function createEmptySnapshot(): CoachSnapshot {
  return {
    settings: {
      schemaVersion: 1,
      updatedAtMs: Date.now(),
      paceSecondsPerTwoPages: 130,
      breakTiers: [
        { everyPages: 10, durationSeconds: 120, kind: 'long' },
        { everyPages: 5, durationSeconds: 60, kind: 'short' },
        { everyPages: 2, durationSeconds: 15, kind: 'micro' },
      ],
      softChimeEnabled: true,
      reducedMotion: false,
      largeText: true,
      highContrast: false,
      sepiaTheme: true,
      resumeOnReopen: true,
      locale: 'en',
    },
    activeSession: null,
    historyEntries: [],
    readerContext: null,
  }
}

export function SidePanelApp() {
  const [snapshot, setSnapshot] = useState<CoachSnapshot>(createEmptySnapshot)
  const [surface, setSurface] = useState<'session' | 'history' | 'settings'>('session')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [portabilityMessage, setPortabilityMessage] = useState<string | null>(null)
  const [portabilityBusy, setPortabilityBusy] = useState(false)

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
    if (!snapshot.activeSession || snapshot.activeSession.status === 'idle') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [snapshot.activeSession])

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
  const strings = getStrings(settings.locale)
  const timeline =
    activeSession && activeSession.status !== 'idle'
      ? buildTimeline(activeSession, settings.locale)
      : []
  const historyView = buildHistoryEntries(historyEntries, settings.locale)
  const settingsValues = buildSettingsFormValues(settings)

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
          ? `Page ${activeSession.activeBreak.triggerPage} reached while reading on Quran.com.`
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
      canStart={!activeSession || activeSession.status === 'idle'}
      canUndo={Boolean(activeSession && activeSession.pageEvents.length > 0)}
      estimatedToBreakLabel={buildEstimatedToBreakLabel(activeSession, settings)}
      historyEntries={historyView}
      liveAnnouncement={liveAnnouncement}
      mode="extension"
      nextBreakLabel={buildNextBreakLabel(activeSession, settings)}
      onAddPage={() => void runCommand({ type: 'add-pages', pages: 1 })}
      onAddTwoPages={() => void runCommand({ type: 'add-pages', pages: 2 })}
      onEndSession={() => {
        void runCommand({ type: 'end-session' }, 'Session saved to history.')
        setSurface('history')
      }}
      onExportData={() => void handleExportData()}
      onImportData={(file) => void handleImportData(file)}
      onPauseToggle={() => {
        void runCommand(
          { type: 'toggle-pause' },
          activeSession?.status === 'paused' ? 'Session resumed.' : 'Session paused.',
        )
      }}
      onResetHistory={() => void runCommand({ type: 'reset-history' }, 'History cleared.')}
      onResetSettings={() => void runCommand({ type: 'reset-settings' }, 'Settings reset.')}
      onResumeNow={() => void runCommand({ type: 'resume-break' }, 'Break completed.')}
      onSettingsChange={(values) => {
        const nextSettings: TimerSettings = {
          ...settings,
          updatedAtMs: Date.now(),
          paceSecondsPerTwoPages: Math.max(30, Math.trunc(values.paceSecondsPerTwoPages)),
          breakTiers: buildBreakTiers(values),
          softChimeEnabled: values.softChime,
          reducedMotion: values.reducedMotion,
          largeText: values.largeText,
          highContrast: values.highContrast,
          sepiaTheme: values.sepiaTheme,
          resumeOnReopen: values.resumeOnReopen,
        }

        void runCommand({ type: 'update-settings', settings: nextSettings })
      }}
      onSkipBreak={() => void runCommand({ type: 'skip-break' }, 'Break skipped once.')}
      onSnoozeBreak={() => void runCommand({ type: 'snooze-break', seconds: 30 })}
      onStartSession={() => void runCommand({ type: 'start-session' }, 'Session started.')}
      onSurfaceChange={setSurface}
      onUndo={() => void runCommand({ type: 'undo-last-pages' }, 'Undid the last page mark.')}
      pageCount={activeSession?.totalPages ?? 0}
      paceHint={buildPaceHint(activeSession, settings, nowMs)}
      pauseLabel={activeSession?.status === 'paused' ? 'Resume' : 'Pause'}
      portabilityBusy={portabilityBusy}
      portabilityMessage={portabilityMessage}
      readerContext={readerContext}
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
