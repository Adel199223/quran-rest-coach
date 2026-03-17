import {
  BreakOverlay,
  DataTransferPanel,
  HistorySurface,
  ReaderContextCard,
  SessionSurface,
  SettingsSurface,
  SurfaceTabs,
  type HistoryEntryView,
  type SessionStatus,
  type SessionTimelineEntry,
  type SettingsFormValues,
  type SurfaceKey,
} from '../components'
import type { ActiveSession, ReaderContext, TimerSettings } from '../domain'

export interface CoachDashboardProps {
  mode: 'standalone' | 'extension'
  appTitle: string
  summaryLabel: string
  settings: TimerSettings
  surface: SurfaceKey
  onSurfaceChange: (surface: SurfaceKey) => void
  status: SessionStatus
  statusLabel: string
  pageCount: number
  nextBreakLabel: string
  estimatedToBreakLabel: string
  paceHint?: string | null
  timeline: SessionTimelineEntry[]
  historyEntries: HistoryEntryView[]
  settingsValues: SettingsFormValues
  readerContext: ReaderContext | null
  trackingLabel: string
  trackingCopy: string
  pauseLabel: string
  liveAnnouncement: string
  portabilityMessage?: string | null
  portabilityBusy?: boolean
  pendingResumeSession?: ActiveSession | null
  canStart?: boolean
  canAddPage?: boolean
  canAddTwoPages?: boolean
  canUndo?: boolean
  canPause?: boolean
  canEnd?: boolean
  breakTitle: string
  breakReason: string
  breakSuggestion: string
  breakCountdownSeconds: number
  breakOpen: boolean
  onStartSession: () => void
  onAddPage: () => void
  onAddTwoPages: () => void
  onUndo: () => void
  onPauseToggle: () => void
  onEndSession: () => void
  onResumeNow: () => void
  onSkipBreak: () => void
  onSnoozeBreak: () => void
  onSettingsChange: (values: SettingsFormValues) => void
  onResetSettings: () => void
  onResetHistory: () => void
  onExportData: () => void
  onImportData: (file: File) => void
  onResumeSavedSession?: () => void
  onDiscardSavedSession?: () => void
}

function getPendingStatusLabel(session: ActiveSession | null): string {
  if (!session || session.status === 'idle') {
    return 'Ready'
  }

  if (session.status === 'break') {
    return 'Resting'
  }

  return session.status === 'paused' ? 'Paused' : 'Reading'
}

export function CoachDashboard({
  mode,
  appTitle,
  summaryLabel,
  settings,
  surface,
  onSurfaceChange,
  status,
  statusLabel,
  pageCount,
  nextBreakLabel,
  estimatedToBreakLabel,
  paceHint,
  timeline,
  historyEntries,
  settingsValues,
  readerContext,
  trackingLabel,
  trackingCopy,
  pauseLabel,
  liveAnnouncement,
  portabilityMessage,
  portabilityBusy = false,
  pendingResumeSession = null,
  canStart = true,
  canAddPage = true,
  canAddTwoPages = true,
  canUndo = true,
  canPause = true,
  canEnd = true,
  breakTitle,
  breakReason,
  breakSuggestion,
  breakCountdownSeconds,
  breakOpen,
  onStartSession,
  onAddPage,
  onAddTwoPages,
  onUndo,
  onPauseToggle,
  onEndSession,
  onResumeNow,
  onSkipBreak,
  onSnoozeBreak,
  onSettingsChange,
  onResetSettings,
  onResetHistory,
  onExportData,
  onImportData,
  onResumeSavedSession,
  onDiscardSavedSession,
}: CoachDashboardProps) {
  return (
    <div
      className="coach-shell"
      data-theme={settings.highContrast ? 'contrast' : settings.sepiaTheme ? 'sepia' : 'plain'}
      data-large-text={settings.largeText ? 'true' : 'false'}
      data-reduced-motion={settings.reducedMotion ? 'true' : 'false'}
      data-layout={mode}
    >
      <header className="coach-header">
        <p className="coach-kicker">
          {mode === 'extension' ? 'Quran.com companion' : 'Local-first pacing'}
        </p>
        <h1 className="coach-title">{appTitle}</h1>
        <p className="coach-subtitle">
          {mode === 'extension'
            ? 'A reading-first side panel for Quran.com, with automatic page tracking, gentle break prompts, and local history.'
            : 'A calm companion for Quran reading sessions that need page-based breaks, soft prompts, and quick recovery when focus gets heavy.'}
        </p>
        <p className="coach-subtitle">{summaryLabel}</p>
      </header>

      <SurfaceTabs active={surface} onSelect={onSurfaceChange} />

      {surface === 'session' ? (
        <>
          {mode === 'extension' ? (
            <ReaderContextCard
              context={readerContext}
              trackingLabel={trackingLabel}
              trackingCopy={trackingCopy}
            />
          ) : null}
          <SessionSurface
            compact={mode === 'extension'}
            canAddPage={canAddPage}
            canAddTwoPages={canAddTwoPages}
            canEnd={canEnd}
            canPause={canPause}
            canStart={canStart}
            canUndo={canUndo}
            estimatedToBreakLabel={estimatedToBreakLabel}
            nextBreakLabel={nextBreakLabel}
            onAddPage={onAddPage}
            onAddTwoPages={onAddTwoPages}
            onEndSession={onEndSession}
            onPauseToggle={onPauseToggle}
            onStartSession={onStartSession}
            onUndo={onUndo}
            paceHint={paceHint}
            pageCount={pageCount}
            pauseLabel={pauseLabel}
            status={status}
            statusLabel={statusLabel}
            timeline={timeline}
          />
        </>
      ) : null}

      {surface === 'history' ? (
        <HistorySurface entries={historyEntries} onResetHistory={onResetHistory} />
      ) : null}

      {surface === 'settings' ? (
        <>
          <SettingsSurface
            onChange={onSettingsChange}
            onResetSettings={onResetSettings}
            values={settingsValues}
          />
          <DataTransferPanel
            busy={portabilityBusy}
            message={portabilityMessage}
            onExport={onExportData}
            onImport={onImportData}
          />
        </>
      ) : null}

      <BreakOverlay
        breakReason={breakReason}
        breakTitle={breakTitle}
        countdownSeconds={breakCountdownSeconds}
        isOpen={breakOpen}
        onResumeNow={onResumeNow}
        onSkipOnce={onSkipBreak}
        onSnooze={onSnoozeBreak}
        suggestion={breakSuggestion}
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
              The previous session is still saved on this device. You can resume it or discard it
              and start fresh.
            </p>
            <div className="resume-grid">
              <div className="metric-card">
                <p className="metric-label">Pages logged</p>
                <p className="metric-value">{pendingResumeSession.totalPages}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Status</p>
                <p className="metric-value">{getPendingStatusLabel(pendingResumeSession)}</p>
              </div>
            </div>
            <div className="break-actions">
              <button
                type="button"
                className="action-btn action-btn-primary"
                onClick={onResumeSavedSession}
              >
                Resume saved session
              </button>
              <button
                type="button"
                className="action-btn action-btn-soft"
                onClick={onDiscardSavedSession}
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
