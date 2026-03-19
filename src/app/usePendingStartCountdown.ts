import { useEffect, useMemo, useRef, useState } from 'react'
import type { PendingStartView } from '../components'
import type { ReadingIntent } from '../domain/contracts'
import { playPreStartStartCue, playPreStartWarningCue } from '../lib/audio'
import {
  createPendingStartCountdown,
  getPendingStartRemainingSeconds,
  isPendingStartWarningPhase,
  PRE_START_WARNING_THRESHOLD_SECONDS,
  type PendingStartCountdown,
} from './pendingStart'
import { getReadingIntentLabel } from './view-model'

interface UsePendingStartCountdownOptions {
  durationSeconds: number
  warningCueEnabled: boolean
  onStart: (intent: ReadingIntent, startedAtMs: number) => void
  onAnnounce?: (message: string) => void
  initialPendingStart?: PendingStartCountdown | null
  initialNowMs?: number
}

export interface PendingStartController {
  pendingStart: PendingStartCountdown | null
  pendingStartView: PendingStartView | null
  beginPendingStart: (intent: ReadingIntent) => void
  cancelPendingStart: () => void
  startNow: () => void
}

function formatSecondsLabel(seconds: number): string {
  return `${seconds} second${seconds === 1 ? '' : 's'}`
}

export function usePendingStartCountdown({
  durationSeconds,
  warningCueEnabled,
  onStart,
  onAnnounce,
  initialPendingStart = null,
  initialNowMs,
}: UsePendingStartCountdownOptions): PendingStartController {
  const [pendingStart, setPendingStart] = useState<PendingStartCountdown | null>(
    initialPendingStart,
  )
  const [nowMs, setNowMs] = useState(() => initialNowMs ?? Date.now())
  const warningCuePlayedForRef = useRef<number | null>(null)
  const startCuePlayedForRef = useRef<number | null>(null)
  const onStartRef = useRef(onStart)
  const onAnnounceRef = useRef(onAnnounce)

  useEffect(() => {
    onStartRef.current = onStart
    onAnnounceRef.current = onAnnounce
  }, [onStart, onAnnounce])

  useEffect(() => {
    if (!pendingStart) {
      warningCuePlayedForRef.current = null
      startCuePlayedForRef.current = null
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs((previousNowMs) => Math.min(previousNowMs + 200, pendingStart.endsAtMs))
    }, 200)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [pendingStart])

  const pendingStartView = useMemo(
    () =>
      pendingStart
        ? {
            remainingSeconds: getPendingStartRemainingSeconds(pendingStart, nowMs),
            warningPhase: isPendingStartWarningPhase(pendingStart, nowMs),
            intentLabel: getReadingIntentLabel(pendingStart.intent),
          }
        : null,
    [pendingStart, nowMs],
  )

  useEffect(() => {
    if (!pendingStart || !pendingStartView) {
      return
    }

    const countdownId = pendingStart.startedAtMs
    if (
      warningCueEnabled &&
      pendingStart.durationSeconds > PRE_START_WARNING_THRESHOLD_SECONDS &&
      pendingStartView.remainingSeconds <= PRE_START_WARNING_THRESHOLD_SECONDS &&
      pendingStartView.remainingSeconds > 0 &&
      warningCuePlayedForRef.current !== countdownId
    ) {
      warningCuePlayedForRef.current = countdownId
      onAnnounceRef.current?.(
        `${formatSecondsLabel(pendingStartView.remainingSeconds)} until reading starts.`,
      )
      void playPreStartWarningCue().catch(() => {})
    }
  }, [pendingStart, pendingStartView, warningCueEnabled])

  useEffect(() => {
    if (!pendingStart || !pendingStartView) {
      return
    }

    const countdownId = pendingStart.startedAtMs
    if (pendingStartView.remainingSeconds > 0 || startCuePlayedForRef.current === countdownId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (startCuePlayedForRef.current === countdownId) {
        return
      }

      startCuePlayedForRef.current = countdownId
      const intent = pendingStart.intent
      setPendingStart(null)
      if (warningCueEnabled) {
        void playPreStartStartCue().catch(() => {})
      }
      onStartRef.current(intent, Date.now())
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [pendingStart, pendingStartView, warningCueEnabled])

  function beginPendingStart(intent: ReadingIntent) {
    const nextPendingStart = createPendingStartCountdown(intent, durationSeconds, Date.now())
    if (!nextPendingStart) {
      if (warningCueEnabled) {
        void playPreStartStartCue().catch(() => {})
      }
      onStartRef.current(intent, Date.now())
      return
    }

    warningCuePlayedForRef.current = null
    startCuePlayedForRef.current = null
    setNowMs(nextPendingStart.startedAtMs)
    setPendingStart(nextPendingStart)
    onAnnounceRef.current?.(
      `Session starts in ${formatSecondsLabel(nextPendingStart.durationSeconds)}.`,
    )
  }

  function cancelPendingStart() {
    if (!pendingStart) {
      return
    }

    setPendingStart(null)
    onAnnounceRef.current?.('Session start cancelled.')
  }

  function startNow() {
    if (!pendingStart) {
      return
    }

    const intent = pendingStart.intent
    setPendingStart(null)
    if (warningCueEnabled) {
      void playPreStartStartCue().catch(() => {})
    }
    onStartRef.current(intent, Date.now())
  }

  return {
    pendingStart,
    pendingStartView,
    beginPendingStart,
    cancelPendingStart,
    startNow,
  }
}
