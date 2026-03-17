import type { SessionStatus, SessionTimelineEntry } from './types'

interface KeyboardHint {
  action: string
  keyLabel: string
}

export interface SessionSurfaceProps {
  status: SessionStatus
  statusLabel: string
  pageCount: number
  nextBreakLabel: string
  estimatedToBreakLabel: string
  paceHint?: string | null
  timeline: SessionTimelineEntry[]
  pauseLabel?: string
  canStart?: boolean
  canAddPage?: boolean
  canAddTwoPages?: boolean
  canUndo?: boolean
  canPause?: boolean
  canEnd?: boolean
  keyboardHints?: KeyboardHint[]
  compact?: boolean
  onStartSession: () => void
  onAddPage: () => void
  onAddTwoPages: () => void
  onUndo: () => void
  onPauseToggle: () => void
  onEndSession: () => void
}

const DEFAULT_HINTS: KeyboardHint[] = [
  { action: 'Add one page', keyLabel: '1' },
  { action: 'Add two pages', keyLabel: '2' },
  { action: 'Undo last change', keyLabel: 'U' },
  { action: 'Pause or resume', keyLabel: 'P' },
]

export function SessionSurface({
  status,
  statusLabel,
  pageCount,
  nextBreakLabel,
  estimatedToBreakLabel,
  paceHint,
  timeline,
  pauseLabel = 'Pause',
  canStart = true,
  canAddPage = true,
  canAddTwoPages = true,
  canUndo = true,
  canPause = true,
  canEnd = true,
  keyboardHints = DEFAULT_HINTS,
  compact = false,
  onStartSession,
  onAddPage,
  onAddTwoPages,
  onUndo,
  onPauseToggle,
  onEndSession,
}: SessionSurfaceProps) {
  return (
    <section className="surface-panel session-surface" aria-labelledby="session-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Reading cadence</p>
        <h2 id="session-heading" className="surface-title">
          Session
        </h2>
        <p className="surface-description">
          Log pages as you finish them. Breaks are prompted at calm boundaries.
        </p>
      </header>

      <div className="session-metrics" role="list" aria-label="Session overview">
        <article className="metric-card" role="listitem">
          <p className="metric-label">Current status</p>
          <p className={`metric-value status-${status}`}>{statusLabel}</p>
        </article>
        <article className="metric-card" role="listitem">
          <p className="metric-label">Pages this session</p>
          <p className="metric-value">{pageCount}</p>
        </article>
        <article className="metric-card" role="listitem">
          <p className="metric-label">Next break</p>
          <p className="metric-value">{nextBreakLabel}</p>
        </article>
        <article className="metric-card" role="listitem">
          <p className="metric-label">Estimated to break</p>
          <p className="metric-value">{estimatedToBreakLabel}</p>
        </article>
      </div>

      {paceHint ? (
        <div className="pace-hint" aria-live="polite">
          {paceHint}
        </div>
      ) : null}

      <div className="session-actions" role="group" aria-label="Session controls">
        <button
          type="button"
          className="action-btn action-btn-primary"
          onClick={onStartSession}
          disabled={!canStart}
        >
          Start session
        </button>
        <button
          type="button"
          className="action-btn action-btn-strong"
          onClick={onAddPage}
          disabled={!canAddPage}
        >
          +1 page
        </button>
        <button
          type="button"
          className="action-btn action-btn-strong"
          onClick={onAddTwoPages}
          disabled={!canAddTwoPages}
        >
          +2 pages
        </button>
        <button
          type="button"
          className="action-btn action-btn-soft"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="action-btn action-btn-soft"
          onClick={onPauseToggle}
          disabled={!canPause}
        >
          {pauseLabel}
        </button>
        <button
          type="button"
          className="action-btn action-btn-danger"
          onClick={onEndSession}
          disabled={!canEnd}
        >
          End session
        </button>
      </div>

      {compact ? (
        <details className="timeline-section disclosure-panel">
          <summary className="timeline-heading-row disclosure-trigger">
            <span className="mini-heading">Session details</span>
            <span className="mini-note">Timeline and quick review</span>
          </summary>
          {timeline.length === 0 ? (
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
          )}
        </details>
      ) : (
        <>
          <section className="timeline-section" aria-labelledby="timeline-heading">
            <div className="timeline-heading-row">
              <h3 id="timeline-heading" className="mini-heading">
                Session timeline
              </h3>
              <span className="mini-note">Recent events</span>
            </div>
            {timeline.length === 0 ? (
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
            )}
          </section>

          <section className="keyboard-hints" aria-labelledby="hint-heading">
            <h3 id="hint-heading" className="mini-heading">
              Keyboard shortcuts
            </h3>
            <ul className="hint-list">
              {keyboardHints.map((hint) => (
                <li key={`${hint.action}-${hint.keyLabel}`} className="hint-item">
                  <span>{hint.action}</span>
                  <kbd>{hint.keyLabel}</kbd>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  )
}
