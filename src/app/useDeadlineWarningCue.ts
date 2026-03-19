import { useEffect, useRef } from 'react'
import type { ReadingPressureCue } from '../components'
import { playDeadlineWarningCue } from '../lib/audio'

interface UseDeadlineWarningCueOptions {
  cue: ReadingPressureCue | null
  enabled: boolean
}

export function useDeadlineWarningCue({
  cue,
  enabled,
}: UseDeadlineWarningCueOptions) {
  const wasActiveRef = useRef(false)

  useEffect(() => {
    const isActive =
      enabled &&
      cue?.mode === 'reading-window' &&
      cue.phase === 'final-ten' &&
      cue.remainingSeconds > 0

    if (isActive && !wasActiveRef.current) {
      void playDeadlineWarningCue().catch(() => {})
    }

    wasActiveRef.current = isActive
  }, [cue, enabled])
}
