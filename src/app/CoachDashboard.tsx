import {
  BreakOverlay,
  type CompletedSessionSummaryView,
  DataTransferPanel,
  HistorySurface,
  type PendingStartView,
  ReaderContextCard,
  SessionSurface,
  SettingsSurface,
  SurfaceTabs,
  type HistoryEntryView,
  type ReadingPressureCue,
  type ReadingIntentOptionView,
  type SessionStatus,
  type SessionTimelineEntry,
  type SettingsFormValues,
  type StudyLaterItemView,
  type SurfaceKey,
} from '../components'
import type { ActiveSession, ReaderContext, ReadingIntent, TimerSettings } from '../domain'

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
  readingIntent: ReadingIntent
  readingIntentOptions: ReadingIntentOptionView[]
  nextBreakLabel: string
  estimatedToBreakLabel: string
  readingPressureCue?: ReadingPressureCue | null
  currentPagesLate?: number
  paceScore?: number | null
  completedSessionSummary?: CompletedSessionSummaryView | null
  pendingStart?: PendingStartView | null
  resumeAnchorLabel?: string | null
  nextGoalLabel?: string | null
  parkForLaterLabel?: string | null
  parkedCount?: number
  paceHint?: string | null
  timeline: SessionTimelineEntry[]
  historyEntries: HistoryEntryView[]
  studyLaterItems: StudyLaterItemView[]
  settingsValues: SettingsFormValues
  readerContext: ReaderContext | null
  trackingLabel: string
  trackingCopy: string
  pauseLabel: string
  liveAnnouncement: string
  portabilityMessage?: string | null
  portabilityBusy?: boolean
  showDataTransfer?: boolean
  pendingResumeSession?: ActiveSession | null
  canStart?: boolean
  canAddPage?: boolean
  canAddTwoPages?: boolean
  canUndo?: boolean
  canPause?: boolean
  canEnd?: boolean
  canSnoozeDeadline?: boolean
  breakTitle: string
  breakReason: string
  breakSuggestion: string
  breakCountdownSeconds: number
  breakOpen: boolean
  breakShowCountdown?: boolean
  breakDefaultMoreOptionsOpen?: boolean
  settingsAdvancedTimingOpen?: boolean
  onSelectReadingIntent: (intent: ReadingIntent) => void
  onStartSession: () => void
  onStartNow?: () => void
  onCancelPendingStart?: () => void
  onAddPage: () => void
  onAddTwoPages: () => void
  onUndo: () => void
  onPauseToggle: () => void
  onEndSession: () => void
  onSnoozeDeadline?: () => void
  onViewHistory?: () => void
  onResumeNow: () => void
  onSkipBreak: () => void
  onSnoozeBreak: () => void
  onSettingsChange: (values: SettingsFormValues) => void
  onResetSettings: () => void
  onResetHistory: () => void
  onRemoveStudyLater: (itemId: string) => void
  onExportData: () => void
  onImportData: (file: File) => void
  onParkForLater?: () => void
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
  readingIntent,
  readingIntentOptions,
  nextBreakLabel,
  estimatedToBreakLabel,
  readingPressureCue,
  currentPagesLate = 0,
  paceScore = null,
  completedSessionSummary = null,
  pendingStart = null,
  resumeAnchorLabel,
  nextGoalLabel,
  parkForLaterLabel,
  parkedCount = 0,
  paceHint,
  timeline,
  historyEntries,
  studyLaterItems,
  settingsValues,
  readerContext,
  trackingLabel,
  trackingCopy,
  pauseLabel,
  liveAnnouncement,
  portabilityMessage,
  portabilityBusy = false,
  showDataTransfer = true,
  pendingResumeSession = null,
  canStart = true,
  canAddPage = true,
  canAddTwoPages = true,
  canUndo = true,
  canPause = true,
  canEnd = true,
  canSnoozeDeadline = false,
  breakTitle,
  breakReason,
  breakSuggestion,
  breakCountdownSeconds,
  breakOpen,
  breakShowCountdown = false,
  breakDefaultMoreOptionsOpen = false,
  settingsAdvancedTimingOpen = false,
  onSelectReadingIntent,
  onStartSession,
  onStartNow,
  onCancelPendingStart,
  onAddPage,
  onAddTwoPages,
  onUndo,
  onPauseToggle,
  onEndSession,
  onSnoozeDeadline,
  onViewHistory,
  onResumeNow,
  onSkipBreak,
  onSnoozeBreak,
  onSettingsChange,
  onResetSettings,
  onResetHistory,
  onRemoveStudyLater,
  onExportData,
  onImportData,
  onParkForLater,
  onResumeSavedSession,
  onDiscardSavedSession,
}: CoachDashboardProps) {
  const extensionHeader = mode === 'extension'
  const manualCorrectionMode =
    mode === 'extension' && status === 'reading' && Boolean(readerContext?.automaticTrackingAvailable)

  return (
    <div
      className="coach-shell"
      data-theme={settings.highContrast ? 'contrast' : settings.sepiaTheme ? 'sepia' : 'plain'}
      data-large-text={settings.largeText ? 'true' : 'false'}
      data-reduced-motion={settings.reducedMotion ? 'true' : 'false'}
      data-layout={mode}
    >
      <header className={`coach-header ${extensionHeader ? 'coach-header-compact' : ''}`}>
        <p className="coach-kicker">
          {mode === 'extension' ? 'Quran.com companion' : 'Local coach'}
        </p>
        <h1 className="coach-title">{appTitle}</h1>
        {extensionHeader ? null : (
          <p className="coach-subtitle">
            Break coach for Quran reading. Tracks pages, suggests breaks, and saves progress on
            this device.
          </p>
        )}
        <p className="coach-summary-chip">{summaryLabel}</p>
      </header>

      <SurfaceTabs active={surface} onSelect={onSurfaceChange} />

      {surface === 'session' ? (
        <>
          {mode === 'extension' ? (
            <ReaderContextCard
              context={readerContext}
              simplified={settings.simplifiedReadingPanel}
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
            canSnoozeDeadline={canSnoozeDeadline}
            completedSessionSummary={completedSessionSummary}
            currentPagesLate={currentPagesLate}
            estimatedToBreakLabel={estimatedToBreakLabel}
            manualCorrectionMode={manualCorrectionMode}
            nextBreakLabel={nextBreakLabel}
            nextGoalLabel={nextGoalLabel}
            onAddPage={onAddPage}
            onAddTwoPages={onAddTwoPages}
            onCancelPendingStart={onCancelPendingStart}
            onEndSession={onEndSession}
            onParkForLater={onParkForLater}
            onPauseToggle={onPauseToggle}
            onSnoozeDeadline={onSnoozeDeadline}
            onSelectReadingIntent={onSelectReadingIntent}
            onStartNow={onStartNow}
            onStartSession={onStartSession}
            onUndo={onUndo}
            onViewHistory={onViewHistory}
            parkForLaterLabel={parkForLaterLabel}
            paceHint={paceHint}
            paceScore={paceScore}
            pageCount={pageCount}
            pauseLabel={pauseLabel}
            parkedCount={parkedCount}
            pendingStart={pendingStart}
            readingIntent={readingIntent}
            readingIntentOptions={readingIntentOptions}
            resumeAnchorLabel={resumeAnchorLabel}
            readingPressureCue={readingPressureCue}
            simplifiedReadingPanel={settings.simplifiedReadingPanel}
            status={status}
            statusLabel={statusLabel}
            timeline={timeline}
          />
        </>
      ) : null}

      {surface === 'history' ? (
        <HistorySurface
          entries={historyEntries}
          onRemoveStudyLater={onRemoveStudyLater}
          onResetHistory={onResetHistory}
          studyLaterItems={studyLaterItems}
        />
      ) : null}

      {surface === 'settings' ? (
        <>
          <SettingsSurface
            key={settingsAdvancedTimingOpen ? 'settings-advanced-open' : 'settings-advanced-closed'}
            defaultAdvancedTimingOpen={settingsAdvancedTimingOpen}
            onChange={onSettingsChange}
            onResetSettings={onResetSettings}
            values={settingsValues}
          />
          {showDataTransfer ? (
            <DataTransferPanel
              busy={portabilityBusy}
              message={portabilityMessage}
              onExport={onExportData}
              onImport={onImportData}
            />
          ) : null}
        </>
      ) : null}

      <BreakOverlay
        breakReason={breakReason}
        breakTitle={breakTitle}
        countdownSeconds={breakCountdownSeconds}
        defaultMoreOptionsOpen={breakDefaultMoreOptionsOpen}
        calmMode={settings.simplifiedReadingPanel}
        isOpen={breakOpen}
        onResumeNow={onResumeNow}
        onSkipOnce={onSkipBreak}
        onSnooze={onSnoozeBreak}
        showCountdown={breakShowCountdown}
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
