import { formatClockDuration } from '../lib/format'

export interface BreakOverlayProps {
  isOpen: boolean
  breakTitle: string
  breakReason: string
  countdownSeconds: number
  suggestion: string
  onResumeNow: () => void
  onSnooze: () => void
  onSkipOnce: () => void
}

export function BreakOverlay({
  isOpen,
  breakTitle,
  breakReason,
  countdownSeconds,
  suggestion,
  onResumeNow,
  onSnooze,
  onSkipOnce,
}: BreakOverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="break-overlay-backdrop">
      <section
        className="break-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-title"
        aria-describedby="break-reason break-suggestion"
      >
        <p className="surface-eyebrow">Rest prompt</p>
        <h2 id="break-title" className="break-title">
          {breakTitle}
        </h2>
        <p id="break-reason" className="break-reason">
          {breakReason}
        </p>
        <p className="break-countdown" aria-live="assertive">
          {formatClockDuration(countdownSeconds)}
        </p>
        <p id="break-suggestion" className="break-suggestion">
          {suggestion}
        </p>
        <div className="break-actions" role="group" aria-label="Break actions">
          <button type="button" className="action-btn action-btn-primary" onClick={onResumeNow}>
            Resume now
          </button>
          <button type="button" className="action-btn action-btn-soft" onClick={onSnooze}>
            Snooze 30s
          </button>
          <button type="button" className="action-btn action-btn-soft" onClick={onSkipOnce}>
            Skip once
          </button>
        </div>
      </section>
    </div>
  )
}
