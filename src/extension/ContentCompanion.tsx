import { useEffect, useState } from 'react'
import type { ActiveSession, ReaderContext, TimerSettings } from '../domain'
import {
  buildNextBreakLabel,
  buildPaceHint,
  buildReadingPressureCue,
  buildTrackingLabel,
} from '../app/view-model'
import { formatBreakKind, formatPageLabel } from '../lib/format'

export interface ContentCompanionProps {
  activeSession: ActiveSession | null
  readerContext: ReaderContext | null
  settings: TimerSettings
  suppressExpandedPrompt?: boolean
  onOpenPanel: () => void
  onResumeBreak: () => void
  onSkipBreak: () => void
  onSnoozeBreak: () => void
}

interface BreakActionsProps {
  calmMode: boolean
  onResumeBreak: () => void
  onSkipBreak: () => void
  onSnoozeBreak: () => void
}

function BreakActions({
  calmMode,
  onResumeBreak,
  onSkipBreak,
  onSnoozeBreak,
}: BreakActionsProps) {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false)

  return (
    <>
      <div className="qrc-toast-actions">
        <button type="button" className="qrc-action qrc-action-primary" onClick={onResumeBreak}>
          Resume
        </button>
        {calmMode ? (
          <button
            type="button"
            className="qrc-action"
            aria-expanded={moreOptionsOpen ? 'true' : 'false'}
            onClick={() => setMoreOptionsOpen((open) => !open)}
          >
            More options
          </button>
        ) : (
          <>
            <button type="button" className="qrc-action" onClick={onSnoozeBreak}>
              Snooze 30s
            </button>
            <button type="button" className="qrc-action" onClick={onSkipBreak}>
              Skip once
            </button>
          </>
        )}
      </div>
      {calmMode && moreOptionsOpen ? (
        <div className="qrc-secondary-actions">
          <button type="button" className="qrc-action" onClick={onSnoozeBreak}>
            Snooze 30s
          </button>
          <button type="button" className="qrc-action" onClick={onSkipBreak}>
            Skip once
          </button>
        </div>
      ) : null}
    </>
  )
}

export function ContentCompanion({
  activeSession,
  readerContext,
  settings,
  suppressExpandedPrompt = false,
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
  const readingPressureCue = buildReadingPressureCue(activeSession, settings, nowMs)
  const hasActiveBreak = Boolean(activeSession?.activeBreak)
  const showExpanded = !suppressExpandedPrompt && (hasActiveBreak || Boolean(paceHint))
  const hiddenIdleMode = !activeSession && (!readerContext || readerContext.routeKind === 'unknown')
  const passiveMode = !activeSession && !readerContext?.automaticTrackingAvailable
  const countdown =
    activeSession?.activeBreak
      ? Math.max(0, Math.ceil((activeSession.activeBreak.endsAtMs - nowMs) / 1000))
      : 0
  const calmBreakActions = settings.simplifiedReadingPanel
  const breakStatusCopy =
    activeSession?.activeBreak
      ? settings.showRestCountdown
        ? countdown > 0
          ? `Break timer: ${countdown}s remaining.`
          : 'Ready to resume.'
        : countdown > 0
          ? `${formatBreakKind(activeSession.activeBreak.kind)} underway.`
          : 'Ready to resume.'
      : null
  const subtitle = activeSession
    ? activeSession.status === 'reading' && readingPressureCue?.exactCountdownVisible
      ? readingPressureCue.chipSubtitle
      : buildNextBreakLabel(activeSession, settings)
    : passiveMode
      ? null
      : buildTrackingLabel(readerContext)

  if (suppressExpandedPrompt) {
    return null
  }

  if (hiddenIdleMode && !showExpanded) {
    return null
  }

  return (
    <div
      className={`qrc-companion ${showExpanded ? 'is-expanded' : ''} ${passiveMode ? 'is-passive' : ''}`}
    >
      <button
        type="button"
        className={`qrc-chip ${passiveMode ? 'qrc-chip-passive' : ''} ${
          readingPressureCue?.phase === 'halfway'
            ? 'qrc-chip-phase-halfway'
            : readingPressureCue?.phase === 'final-ten'
              ? 'qrc-chip-phase-final-ten'
              : ''
        }`.trim()}
        onClick={onOpenPanel}
      >
        <span className="qrc-chip-title">
          {activeSession ? formatPageLabel(activeSession.totalPages) : 'Open Rest Coach'}
        </span>
        {subtitle ? <span className="qrc-chip-subtitle">{subtitle}</span> : null}
      </button>

      {showExpanded ? (
        <section className="qrc-toast" role="status" aria-live="polite">
          <div className="qrc-toast-header">
            <p className="qrc-toast-kicker">Quran Rest Coach</p>
            <button type="button" className="qrc-link" onClick={onOpenPanel}>
              Open side panel
            </button>
          </div>

          <h2 className="qrc-toast-title">{hasActiveBreak ? 'Break time' : 'Break due soon'}</h2>
          <p className="qrc-toast-copy">
            {hasActiveBreak
              ? breakStatusCopy
              : paceHint}
          </p>

          {hasActiveBreak ? (
            <BreakActions
              key={activeSession?.activeBreak ? `${activeSession.activeBreak.kind}:${activeSession.activeBreak.startedAtMs}` : 'idle'}
              calmMode={calmBreakActions}
              onResumeBreak={onResumeBreak}
              onSkipBreak={onSkipBreak}
              onSnoozeBreak={onSnoozeBreak}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
