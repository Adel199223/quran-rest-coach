import { useState } from 'react'
import type { ReadingIntent } from '../domain'
import type {
  CompletedSessionSummaryView,
  PendingStartView,
  ReadingIntentOptionView,
  ReadingPressureCue,
  SessionStatus,
  SessionTimelineEntry,
} from './types'

interface KeyboardHint {
  action: string
  keyLabel: string
}

export interface SessionSurfaceProps {
  status: SessionStatus
  statusLabel: string
  readingIntent: ReadingIntent
  readingIntentOptions: ReadingIntentOptionView[]
  pageCount: number
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
  manualCorrectionMode?: boolean
  simplifiedReadingPanel?: boolean
  timeline: SessionTimelineEntry[]
  pauseLabel?: string
  canStart?: boolean
  canAddPage?: boolean
  canAddTwoPages?: boolean
  canUndo?: boolean
  canPause?: boolean
  canEnd?: boolean
  canSnoozeDeadline?: boolean
  keyboardHints?: KeyboardHint[]
  compact?: boolean
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
  onParkForLater?: () => void
}

const DEFAULT_HINTS: KeyboardHint[] = [
  { action: 'Add one page', keyLabel: '1' },
  { action: 'Add two pages', keyLabel: '2' },
  { action: 'Undo last change', keyLabel: 'U' },
  { action: 'Pause or resume', keyLabel: 'P' },
]

function getPaceScoreLabel(score: number): string {
  if (score >= 90) {
    return 'Locked in'
  }

  if (score >= 75) {
    return 'On pace'
  }

  if (score >= 50) {
    return 'Recovering'
  }

  return 'Reset the target'
}

function getBreakTargetDisplay(nextBreakLabel: string): { primary: string; secondary?: string } {
  const atPageMatch = nextBreakLabel.match(/^(.*)\s+at page\s+(\d+)$/i)
  if (atPageMatch) {
    return {
      primary: atPageMatch[1],
      secondary: `Page ${atPageMatch[2]}`,
    }
  }

  const inPagesMatch = nextBreakLabel.match(/^(.*)\s+in\s+(.+)$/i)
  if (inPagesMatch) {
    return {
      primary: inPagesMatch[1],
      secondary: `In ${inPagesMatch[2]}`,
    }
  }

  const nowMatch = nextBreakLabel.match(/^(.*)\s+now$/i)
  if (nowMatch) {
    return {
      primary: nowMatch[1],
      secondary: 'Now',
    }
  }

  return { primary: nextBreakLabel }
}

export function SessionSurface({
  status,
  statusLabel,
  readingIntent,
  readingIntentOptions,
  pageCount,
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
  manualCorrectionMode = false,
  simplifiedReadingPanel = false,
  timeline,
  pauseLabel = 'Pause',
  canStart = true,
  canAddPage = true,
  canAddTwoPages = true,
  canUndo = true,
  canPause = true,
  canEnd = true,
  canSnoozeDeadline = false,
  keyboardHints = DEFAULT_HINTS,
  compact = false,
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
  onParkForLater,
}: SessionSurfaceProps) {
  const [correctionToolsOpen, setCorrectionToolsOpen] = useState(false)
  const idleState = canStart
  const pendingStartActive = pendingStart !== null
  const activeState = !idleState
  const currentIntentOption =
    readingIntentOptions.find((option) => option.value === readingIntent) ?? readingIntentOptions[0]
  const breakTargetDisplay = getBreakTargetDisplay(nextBreakLabel)
  const timerValue =
    readingPressureCue?.phase === 'halfway'
      ? 'Halfway'
      : estimatedToBreakLabel
  const timerCardClassName = `metric-card ${
    readingPressureCue?.phase === 'halfway'
      ? 'metric-card-pressure-halfway'
      : readingPressureCue?.phase === 'final-ten'
        ? 'metric-card-pressure-final-ten'
        : ''
  }`.trim()
  const timerLabelClassName = `metric-label ${
    readingPressureCue?.phase === 'halfway'
      ? 'metric-label-pressure-halfway'
      : readingPressureCue?.phase === 'final-ten'
        ? 'metric-label-pressure-final-ten'
        : ''
  }`.trim()
  const timerValueClassName = `metric-value metric-value-descriptor ${
    readingPressureCue?.phase === 'halfway'
      ? 'metric-value-pressure-halfway'
      : readingPressureCue?.phase === 'final-ten'
        ? 'metric-value-pressure-final-ten'
        : ''
  }`.trim()
  const pressureStrip =
    readingPressureCue?.mode === 'catch-up-window'
      ? {
          tone: 'catchup',
          text: `Catch-up window · ${readingPressureCue.displayLabel}`,
        }
        : currentPagesLate > 0
        ? {
            tone: 'late',
            text: `${currentPagesLate} ${currentPagesLate === 1 ? 'page' : 'pages'} late · Catch up before ${
              breakTargetDisplay.secondary?.toLowerCase() ?? breakTargetDisplay.primary.toLowerCase()
            }`,
          }
        : paceScore !== null
          ? {
              tone: 'score',
              text: paceHint ?? `Score ${paceScore} · ${getPaceScoreLabel(paceScore)}`,
            }
          : null
  const showLegacyPaceHint = Boolean(paceHint) && !pressureStrip
  const startControl = pendingStartActive ? (
    <div
      className={`pending-start-card ${pendingStart.warningPhase ? 'pending-start-card-warning' : ''}`}
      aria-live="polite"
    >
      <p className="action-state-kicker">Start delay</p>
      <p className="pending-start-countdown">{pendingStart.remainingSeconds}</p>
      <p className="pending-start-copy">
        {pendingStart.warningPhase
          ? 'Get your eyes in place. Reading starts soon.'
          : `Starting ${pendingStart.intentLabel} in ${pendingStart.remainingSeconds} second${pendingStart.remainingSeconds === 1 ? '' : 's'}.`}
      </p>
      <div className="pending-start-actions">
        <button type="button" className="action-btn action-btn-primary" onClick={onStartNow}>
          Start now
        </button>
        <button type="button" className="action-btn action-btn-soft" onClick={onCancelPendingStart}>
          Cancel
        </button>
      </div>
    </div>
  ) : canStart ? (
    <button type="button" className="action-btn action-btn-primary" onClick={onStartSession}>
      Start session
    </button>
  ) : (
    <div className="action-state-card">
      <p className="action-state-kicker">Session active</p>
      <p className={`action-state-value status-${status}`}>{statusLabel}</p>
    </div>
  )

  const showCorrectionDisclosure =
    compact && manualCorrectionMode && simplifiedReadingPanel && !canStart

  const idleFocusSection =
    idleState && (currentIntentOption || resumeAnchorLabel || nextGoalLabel) ? (
      <section className="reading-focus" aria-labelledby="reading-focus-heading">
        <div className="timeline-heading-row">
          <h3 id="reading-focus-heading" className="mini-heading">
            Session intent
          </h3>
        </div>

        <p className="mini-note">
          {pendingStartActive
            ? 'Intent is locked until reading starts.'
            : 'Choose how you want to read today.'}
        </p>
        <div className="intent-chip-row" role="radiogroup" aria-label="Reading intent">
          {readingIntentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`intent-chip ${option.value === readingIntent ? 'intent-chip-active' : ''}`}
              aria-pressed={option.value === readingIntent}
              disabled={pendingStartActive}
              onClick={() => onSelectReadingIntent(option.value)}
            >
              <span>{option.label}</span>
              <span className="intent-chip-detail">{option.detail}</span>
            </button>
          ))}
        </div>
        {resumeAnchorLabel || nextGoalLabel ? (
          <div className="reading-summary-strip reading-summary-strip-idle" aria-label="Reading focus summary">
            {resumeAnchorLabel ? (
              <article className="reading-summary-item">
                <p className="reading-summary-label">Resume from</p>
                <p className="reading-summary-value">{resumeAnchorLabel}</p>
              </article>
            ) : null}
            {nextGoalLabel ? (
              <article className="reading-summary-item">
                <p className="reading-summary-label">Next step</p>
                <p className="reading-summary-value">{nextGoalLabel}</p>
              </article>
            ) : null}
          </div>
        ) : null}
      </section>
    ) : null

  const activeFocusSection =
    activeState && (currentIntentOption || resumeAnchorLabel || nextGoalLabel || parkForLaterLabel) ? (
      <section className="reading-summary-strip" aria-label="Reading focus summary">
        {currentIntentOption ? (
          <article className="reading-summary-item">
            <p className="reading-summary-label">Intent</p>
            <p className="reading-summary-value">{currentIntentOption.label}</p>
          </article>
        ) : null}
        {resumeAnchorLabel ? (
          <article className="reading-summary-item">
            <p className="reading-summary-label">Resume from</p>
            <p className="reading-summary-value">{resumeAnchorLabel}</p>
          </article>
        ) : null}
        {nextGoalLabel ? (
          <article className="reading-summary-item reading-summary-item-wide">
            <p className="reading-summary-label">Next step</p>
            <p className="reading-summary-value">{nextGoalLabel}</p>
          </article>
        ) : null}
        {parkForLaterLabel && onParkForLater ? (
          <div className="reading-summary-actions">
            <button
              type="button"
              className="action-btn action-btn-quiet action-btn-pill"
              aria-label={parkForLaterLabel}
              onClick={onParkForLater}
            >
              Park for later
            </button>
            {parkedCount > 0 ? (
              <span className="reading-summary-meta">
                {parkedCount} saved
              </span>
            ) : null}
          </div>
        ) : null}
      </section>
    ) : null

  const focusSection = idleState ? idleFocusSection : activeFocusSection

  const overview = (
    <div className="session-metrics" role="list" aria-label="Session overview">
      <article className="metric-card metric-card-number" role="listitem">
        <p className="metric-label">Pages</p>
        <p className="metric-value">{pageCount}</p>
      </article>
      <article className="metric-card metric-card-descriptor" role="listitem">
        <p className="metric-label">Break target</p>
        <p className="metric-value metric-value-descriptor">{breakTargetDisplay.primary}</p>
        {breakTargetDisplay.secondary ? (
          <p className="metric-detail">{breakTargetDisplay.secondary}</p>
        ) : null}
      </article>
      <article className={`${timerCardClassName} metric-card-descriptor`} role="listitem">
        <p className={timerLabelClassName}>Timer</p>
        <p className={timerValueClassName}>{timerValue}</p>
      </article>
      <article className="metric-card metric-card-descriptor" role="listitem">
        <p className="metric-label">Status</p>
        <p className={`metric-value metric-value-descriptor status-${status}`}>{statusLabel}</p>
      </article>
    </div>
  )

  const timelineContent =
    timeline.length === 0 ? (
      <p className="empty-state">No session events yet.</p>
    ) : (
      <ol className="timeline-list">
        {timeline.map((entry) => (
          <li key={entry.id} className={`timeline-item tone-${entry.tone ?? 'neutral'}`}>
            <div>
              <p className="timeline-title">{entry.title}</p>
              <p className="timeline-detail">{entry.detail}</p>
            </div>
            <span className="timeline-time">{entry.timeLabel}</span>
          </li>
        ))}
      </ol>
    )

  const actions = idleState ? (
    <div className="session-actions" role="group" aria-label="Session controls">
      {startControl}
    </div>
  ) : (
    <div className="session-action-toolbar" role="toolbar" aria-label="Session controls">
      {showCorrectionDisclosure ? (
        <div className="correction-tools">
          <button
            type="button"
            className="action-btn action-btn-soft action-btn-pill correction-tools-trigger"
            aria-expanded={correctionToolsOpen ? 'true' : 'false'}
            onClick={() => setCorrectionToolsOpen((open) => !open)}
          >
            Correction tools
          </button>
          {correctionToolsOpen ? (
            <>
              <p className="mini-note correction-tools-note">
                Use these only if tracking missed a page.
              </p>
              <div className="correction-tools-grid">
                <button
                  type="button"
                  className="action-btn action-btn-soft action-btn-pill"
                  aria-label="Correct 1 page"
                  onClick={onAddPage}
                  disabled={!canAddPage}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-soft action-btn-pill"
                  aria-label="Correct 2 pages"
                  onClick={onAddTwoPages}
                  disabled={!canAddTwoPages}
                >
                  +2
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-quiet action-btn-pill action-btn-icon-text"
                  aria-label="Undo last page change"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <span aria-hidden="true">↶</span>
                  <span>Undo</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <>
          {canAddPage ? (
            <button
              type="button"
              className={`action-btn action-btn-pill ${
                manualCorrectionMode ? 'action-btn-soft' : 'action-btn-strong'
              }`}
              aria-label={manualCorrectionMode ? 'Correct 1 page' : 'Add 1 page'}
              onClick={onAddPage}
            >
              +1
            </button>
          ) : null}
          {canAddTwoPages ? (
            <button
              type="button"
              className={`action-btn action-btn-pill ${
                manualCorrectionMode ? 'action-btn-soft' : 'action-btn-strong'
              }`}
              aria-label={manualCorrectionMode ? 'Correct 2 pages' : 'Add 2 pages'}
              onClick={onAddTwoPages}
            >
              +2
            </button>
          ) : null}
          {canSnoozeDeadline ? (
            <button
              type="button"
              className="action-btn action-btn-soft action-btn-pill"
              aria-label="Snooze deadline by 10 seconds"
              onClick={onSnoozeDeadline}
            >
              Snooze +10s
            </button>
          ) : null}
          {canUndo ? (
            <button
              type="button"
              className="action-btn action-btn-quiet action-btn-pill action-btn-icon-text"
              aria-label="Undo last page change"
              onClick={onUndo}
            >
              <span aria-hidden="true">↶</span>
              <span>Undo</span>
            </button>
          ) : null}
        </>
      )}
      {canPause ? (
        <button
          type="button"
          className="action-btn action-btn-soft action-btn-pill"
          aria-label={`${pauseLabel} session`}
          onClick={onPauseToggle}
        >
          {pauseLabel}
        </button>
      ) : null}
      {canEnd ? (
        <button
          type="button"
          className="action-btn action-btn-danger action-btn-pill"
          aria-label="End session"
          onClick={onEndSession}
        >
          End
        </button>
      ) : null}
    </div>
  )

  return (
    <section className="surface-panel session-surface" aria-labelledby="session-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Reading session</p>
        <h2 id="session-heading" className="surface-title">
          Session
        </h2>
        <p className="surface-description">
          {compact
            ? 'Track pages and keep the next break in view.'
            : 'Log pages and keep the next break in view.'}
        </p>
      </header>

      {completedSessionSummary ? (
        <section className="completion-summary" aria-labelledby="completion-summary-heading">
          <div className="timeline-heading-row">
            <h3 id="completion-summary-heading" className="mini-heading">
              {completedSessionSummary.title}
            </h3>
            <span className="mini-note">{completedSessionSummary.paceScoreLabel}</span>
          </div>
          <p className="mini-note">{completedSessionSummary.subtitle}</p>
          {completedSessionSummary.paceScoreReasons.length > 0 ? (
            <p className="mini-note completion-summary-reasons">
              {completedSessionSummary.paceScoreReasons.join(' · ')}
            </p>
          ) : null}
          <div className="session-metrics" role="list" aria-label="Completed session summary">
            <article className="metric-card" role="listitem">
              <p className="metric-label">Score</p>
              <p className="metric-value">{completedSessionSummary.paceScore}</p>
            </article>
            <article className="metric-card" role="listitem">
              <p className="metric-label">Pages</p>
              <p className="metric-value">{completedSessionSummary.pagesCompleted}</p>
            </article>
            <article className="metric-card" role="listitem">
              <p className="metric-label">Deadline snoozes</p>
              <p className="metric-value">{completedSessionSummary.deadlineSnoozes}</p>
            </article>
            <article className="metric-card" role="listitem">
              <p className="metric-label">Max pages late</p>
              <p className="metric-value">{completedSessionSummary.maxLatePages}</p>
            </article>
          </div>
          <div className="completion-summary-stats" aria-label="Completed session score details">
            <span className="history-stat-chip">
              <span className="history-stat-chip-label">On-time</span>
              <span className="history-stat-chip-value">{completedSessionSummary.onTimeWindows}</span>
            </span>
            <span className="history-stat-chip">
              <span className="history-stat-chip-label">Recovered</span>
              <span className="history-stat-chip-value">{completedSessionSummary.recoveredWindows}</span>
            </span>
            <span className="history-stat-chip">
              <span className="history-stat-chip-label">Best streak</span>
              <span className="history-stat-chip-value">{completedSessionSummary.bestOnTimeStreak}</span>
            </span>
          </div>
          <div className="reading-focus-actions">
            {onViewHistory ? (
              <button type="button" className="action-btn action-btn-soft" onClick={onViewHistory}>
                View history
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {focusSection}

      {idleState ? actions : null}

      {overview}

      {pressureStrip ? (
        <div
          className={`pressure-strip pressure-strip-${pressureStrip.tone}`}
          aria-live="polite"
        >
          {pressureStrip.text}
        </div>
      ) : showLegacyPaceHint ? (
        <div className="pace-hint" aria-live="polite">
          {paceHint}
        </div>
      ) : null}

      {idleState ? null : actions}

      {compact && !idleState ? (
        <details className="timeline-section disclosure-panel">
          <summary className="timeline-heading-row disclosure-trigger">
            <span className="disclosure-title-group">
              <span className="mini-heading">Session details</span>
              <span className="mini-note">Timeline and quick review</span>
            </span>
            <span className="disclosure-chevron" aria-hidden="true">
              ˅
            </span>
          </summary>
          {timelineContent}
        </details>
      ) : !compact && !idleState ? (
        <div className="session-secondary-grid">
          <details className="timeline-section disclosure-panel">
            <summary className="timeline-heading-row disclosure-trigger">
              <span className="disclosure-title-group">
                <span className="mini-heading">Session details</span>
                <span className="mini-note">Timeline and quick review</span>
              </span>
              <span className="disclosure-chevron" aria-hidden="true">
                ˅
              </span>
            </summary>
            {timelineContent}
          </details>

          <details className="keyboard-hints disclosure-panel">
            <summary className="timeline-heading-row disclosure-trigger">
              <span className="disclosure-title-group">
                <span className="mini-heading">Keyboard shortcuts</span>
                <span className="mini-note">Optional quick keys</span>
              </span>
              <span className="disclosure-chevron" aria-hidden="true">
                ˅
              </span>
            </summary>
            <ul className="hint-list">
              {keyboardHints.map((hint) => (
                <li key={`${hint.action}-${hint.keyLabel}`} className="hint-item">
                  <span>{hint.action}</span>
                  <kbd>{hint.keyLabel}</kbd>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </section>
  )
}
