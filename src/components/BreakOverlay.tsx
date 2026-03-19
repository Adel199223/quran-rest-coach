import { useState } from 'react'
import { formatClockDuration } from '../lib/format'

export interface BreakOverlayProps {
  isOpen: boolean
  breakTitle: string
  breakReason: string
  countdownSeconds: number
  suggestion: string
  showCountdown?: boolean
  calmMode?: boolean
  defaultMoreOptionsOpen?: boolean
  onResumeNow: () => void
  onSnooze: () => void
  onSkipOnce: () => void
}

interface BreakOverlayDialogProps {
  breakTitle: string
  breakReason: string
  countdownSeconds: number
  suggestion: string
  showCountdown: boolean
  calmMode: boolean
  defaultMoreOptionsOpen: boolean
  onResumeNow: () => void
  onSnooze: () => void
  onSkipOnce: () => void
}

function BreakOverlayDialog({
  breakTitle,
  breakReason,
  countdownSeconds,
  suggestion,
  showCountdown,
  calmMode,
  defaultMoreOptionsOpen,
  onResumeNow,
  onSnooze,
  onSkipOnce,
}: BreakOverlayDialogProps) {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(defaultMoreOptionsOpen)

  const countdownLabel =
    countdownSeconds > 0
      ? showCountdown
        ? `${formatClockDuration(countdownSeconds)} remaining`
        : `${breakTitle || 'Break'} underway`
      : 'Ready to resume'

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
        <p className="break-status" aria-live="polite">
          {countdownLabel}
        </p>
        <p id="break-suggestion" className="break-suggestion">
          {suggestion}
        </p>
        <div className="break-actions" role="group" aria-label="Break actions">
          <button type="button" className="action-btn action-btn-primary" onClick={onResumeNow}>
            Resume now
          </button>
          {calmMode ? (
            <button
              type="button"
              className="action-btn action-btn-soft"
              aria-expanded={moreOptionsOpen ? 'true' : 'false'}
              onClick={() => setMoreOptionsOpen((open) => !open)}
            >
              More options
            </button>
          ) : (
            <>
              <button type="button" className="action-btn action-btn-soft" onClick={onSnooze}>
                Snooze 30s
              </button>
              <button type="button" className="action-btn action-btn-soft" onClick={onSkipOnce}>
                Skip once
              </button>
            </>
          )}
        </div>
        {calmMode && moreOptionsOpen ? (
          <div className="break-secondary-actions" role="group" aria-label="More break options">
            <button type="button" className="action-btn action-btn-soft" onClick={onSnooze}>
              Snooze 30s
            </button>
            <button type="button" className="action-btn action-btn-soft" onClick={onSkipOnce}>
              Skip once
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export function BreakOverlay({
  isOpen,
  breakTitle,
  breakReason,
  countdownSeconds,
  suggestion,
  showCountdown = false,
  calmMode = true,
  defaultMoreOptionsOpen = false,
  onResumeNow,
  onSnooze,
  onSkipOnce,
}: BreakOverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <BreakOverlayDialog
      key={defaultMoreOptionsOpen ? 'expanded' : 'collapsed'}
      breakReason={breakReason}
      breakTitle={breakTitle}
      calmMode={calmMode}
      countdownSeconds={countdownSeconds}
      defaultMoreOptionsOpen={defaultMoreOptionsOpen}
      onResumeNow={onResumeNow}
      onSkipOnce={onSkipOnce}
      onSnooze={onSnooze}
      showCountdown={showCountdown}
      suggestion={suggestion}
    />
  )
}
