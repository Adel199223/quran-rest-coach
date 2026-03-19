import type { HistoryEntryView, StudyLaterItemView } from './types'

export interface HistorySurfaceProps {
  entries: HistoryEntryView[]
  studyLaterItems: StudyLaterItemView[]
  onResetHistory: () => void
  onRemoveStudyLater: (itemId: string) => void
}

export function HistorySurface({
  entries,
  studyLaterItems,
  onResetHistory,
  onRemoveStudyLater,
}: HistorySurfaceProps) {
  return (
    <section className="surface-panel history-surface" aria-labelledby="history-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Session review</p>
        <h2 id="history-heading" className="surface-title">
          History
        </h2>
        <p className="surface-description">
          Review past sessions and anything you parked for later.
        </p>
      </header>

      <div className="history-toolbar">
        <p className="mini-note">{entries.length} session records</p>
        <button type="button" className="action-btn action-btn-soft" onClick={onResetHistory}>
          Reset history
        </button>
      </div>

      <section className="history-subsection" aria-labelledby="study-later-heading">
        <div className="timeline-heading-row">
          <h3 id="study-later-heading" className="mini-heading">
            Study later
          </h3>
          <span className="mini-note">{studyLaterItems.length} saved</span>
        </div>

        {studyLaterItems.length === 0 ? (
          <div className="empty-card history-empty-card" role="status" aria-live="polite">
            <p className="empty-title">Nothing saved for later</p>
            <p className="empty-copy">
              Save a verse or page while reading so you can come back without losing momentum.
            </p>
          </div>
        ) : (
          <ul className="study-later-list" aria-label="Saved verses and pages to revisit later">
            {studyLaterItems.map((item) => (
              <li key={item.id} className="study-later-card">
                <div>
                  <p className="study-later-title">{item.title}</p>
                  <p className="study-later-meta">{item.locationLabel}</p>
                  <p className="mini-note">
                    {item.savedAtLabel}
                    {item.intentLabel ? ` · ${item.intentLabel}` : ''}
                  </p>
                </div>
                <div className="study-later-actions">
                  <a
                    className="action-btn action-btn-soft action-btn-pill study-later-action-link"
                    href={item.openUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open on Quran.com
                  </a>
                  {item.studyUrl ? (
                    <a
                      className="action-btn action-btn-soft action-btn-pill study-later-action-link"
                      href={item.studyUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open study view
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="action-btn action-btn-quiet action-btn-pill study-later-action-link"
                    onClick={() => onRemoveStudyLater(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entries.length === 0 ? (
        <div className="empty-card" role="status" aria-live="polite">
          <p className="empty-title">No sessions yet</p>
          <p className="empty-copy">
            Start a session to begin tracking breaks, snoozes, and reading rhythm.
          </p>
        </div>
      ) : (
        <ul className="history-list" aria-label="Completed session history">
          {entries.map((entry) => (
            <li key={entry.id} className="history-card">
              <header className="history-card-header">
                <div>
                  <p className="history-card-date">{entry.dateLabel}</p>
                  <p className="mini-note history-score-line">
                    Score {entry.paceScore} · {entry.paceScoreLabel}
                    {entry.paceScoreReasons.length > 0 ? ` · ${entry.paceScoreReasons.join(' · ')}` : ''}
                  </p>
                </div>
                <p className="history-card-time">{entry.timeRangeLabel}</p>
              </header>
              <dl className="history-grid">
                <div className="history-stat">
                  <dt>Duration</dt>
                  <dd>{entry.durationLabel}</dd>
                </div>
                <div className="history-stat">
                  <dt>Pages</dt>
                  <dd>{entry.pagesCompleted}</dd>
                </div>
                <div className="history-stat">
                  <dt>Breaks</dt>
                  <dd>{entry.breaksTaken}</dd>
                </div>
                <div className="history-stat">
                  <dt>Snoozes</dt>
                  <dd>{entry.snoozes}</dd>
                </div>
                <div className="history-stat">
                  <dt>Skipped</dt>
                  <dd>{entry.skips}</dd>
                </div>
              </dl>
              <div className="history-score-details" aria-label="Session score details">
                <span className="history-stat-chip">
                  <span className="history-stat-chip-label">On-time</span>
                  <span className="history-stat-chip-value">{entry.onTimeWindows}</span>
                </span>
                <span className="history-stat-chip">
                  <span className="history-stat-chip-label">Recovered</span>
                  <span className="history-stat-chip-value">{entry.recoveredWindows}</span>
                </span>
                <span className="history-stat-chip">
                  <span className="history-stat-chip-label">Best streak</span>
                  <span className="history-stat-chip-value">{entry.bestOnTimeStreak}</span>
                </span>
                <span className="history-stat-chip">
                  <span className="history-stat-chip-label">Deadline extensions</span>
                  <span className="history-stat-chip-value">{entry.deadlineSnoozes}</span>
                </span>
              </div>
              {entry.notes ? <p className="history-notes">{entry.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
