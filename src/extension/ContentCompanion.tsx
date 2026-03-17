import { useEffect, useState } from 'react'
import type { ActiveSession, ReaderContext, TimerSettings } from '../domain'
import {
  buildNextBreakLabel,
  buildPaceHint,
  buildTrackingLabel,
} from '../app/view-model'

export interface ContentCompanionProps {
  activeSession: ActiveSession | null
  readerContext: ReaderContext | null
  settings: TimerSettings
  onOpenPanel: () => void
  onResumeBreak: () => void
  onSkipBreak: () => void
  onSnoozeBreak: () => void
}

export function ContentCompanion({
  activeSession,
  readerContext,
  settings,
  onOpenPanel,
  onResumeBreak,
  onSkipBreak,
  onSnoozeBreak,
}: ContentCompanionProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const paceHint = buildPaceHint(activeSession, settings, nowMs)
  const hasActiveBreak = Boolean(activeSession?.activeBreak)
  const showExpanded = hasActiveBreak || Boolean(paceHint)
  const countdown =
    activeSession?.activeBreak
      ? Math.max(0, Math.ceil((activeSession.activeBreak.endsAtMs - nowMs) / 1000))
      : 0

  return (
    <div className={`qrc-companion ${showExpanded ? 'is-expanded' : ''}`}>
      <button type="button" className="qrc-chip" onClick={onOpenPanel}>
        <span className="qrc-chip-title">
          {activeSession ? `${activeSession.totalPages} pages` : 'Open Rest Coach'}
        </span>
        <span className="qrc-chip-subtitle">
          {activeSession ? buildNextBreakLabel(activeSession, settings) : buildTrackingLabel(readerContext)}
        </span>
      </button>

      {showExpanded ? (
        <section className="qrc-toast" role="status" aria-live="polite">
          <div className="qrc-toast-header">
            <p className="qrc-toast-kicker">Quran Rest Coach</p>
            <button type="button" className="qrc-link" onClick={onOpenPanel}>
              Open panel
            </button>
          </div>

          <h2 className="qrc-toast-title">
            {hasActiveBreak ? 'Break prompt is live' : 'Break due soon'}
          </h2>
          <p className="qrc-toast-copy">
            {hasActiveBreak
              ? `Countdown: ${countdown}s. Use a gentle reset before continuing.`
              : paceHint}
          </p>

          {hasActiveBreak ? (
            <div className="qrc-toast-actions">
              <button type="button" className="qrc-action qrc-action-primary" onClick={onResumeBreak}>
                Resume
              </button>
              <button type="button" className="qrc-action" onClick={onSnoozeBreak}>
                Snooze 30s
              </button>
              <button type="button" className="qrc-action" onClick={onSkipBreak}>
                Skip once
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
