import type { HistoryEntryView } from './types'

export interface HistorySurfaceProps {
  entries: HistoryEntryView[]
  onResetHistory: () => void
}

export function HistorySurface({ entries, onResetHistory }: HistorySurfaceProps) {
  return (
    <section className="surface-panel history-surface" aria-labelledby="history-heading">
      <header className="surface-header">
        <p className="surface-eyebrow">Pattern review</p>
        <h2 id="history-heading" className="surface-title">
          History
        </h2>
        <p className="surface-description">
          Review completed sessions and spot the cadence that feels sustainable.
        </p>
      </header>

      <div className="history-toolbar">
        <p className="mini-note">{entries.length} session records</p>
        <button type="button" className="action-btn action-btn-soft" onClick={onResetHistory}>
          Reset history
        </button>
      </div>

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
                <p className="history-card-date">{entry.dateLabel}</p>
                <p className="history-card-time">{entry.timeRangeLabel}</p>
              </header>
              <dl className="history-grid">
                <div>
                  <dt>Duration</dt>
                  <dd>{entry.durationLabel}</dd>
                </div>
                <div>
                  <dt>Pages</dt>
                  <dd>{entry.pagesCompleted}</dd>
                </div>
                <div>
                  <dt>Breaks</dt>
                  <dd>{entry.breaksTaken}</dd>
                </div>
                <div>
                  <dt>Snoozes</dt>
                  <dd>{entry.snoozes}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd>{entry.skips}</dd>
                </div>
              </dl>
              {entry.notes ? <p className="history-notes">{entry.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
