import type { ReadingIntent } from '../domain/contracts'

export const DEFAULT_PRE_START_COUNTDOWN_SECONDS = 10
export const MAX_PRE_START_COUNTDOWN_SECONDS = 60
export const PRE_START_WARNING_THRESHOLD_SECONDS = 3

export interface PendingStartCountdown {
  intent: ReadingIntent
  durationSeconds: number
  startedAtMs: number
  endsAtMs: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function normalizePreStartCountdownSeconds(value: unknown): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRE_START_COUNTDOWN_SECONDS
  }

  return clamp(Math.trunc(parsed), 0, MAX_PRE_START_COUNTDOWN_SECONDS)
}

export function createPendingStartCountdown(
  intent: ReadingIntent,
  durationSeconds: number,
  nowMs = Date.now(),
): PendingStartCountdown | null {
  const normalizedSeconds = normalizePreStartCountdownSeconds(durationSeconds)
  if (normalizedSeconds <= 0) {
    return null
  }

  return {
    intent,
    durationSeconds: normalizedSeconds,
    startedAtMs: nowMs,
    endsAtMs: nowMs + normalizedSeconds * 1000,
  }
}

export function getPendingStartRemainingSeconds(
  pendingStart: PendingStartCountdown,
  nowMs = Date.now(),
): number {
  return Math.max(0, Math.ceil((pendingStart.endsAtMs - nowMs) / 1000))
}

export function isPendingStartWarningPhase(
  pendingStart: PendingStartCountdown,
  nowMs = Date.now(),
): boolean {
  const remainingSeconds = getPendingStartRemainingSeconds(pendingStart, nowMs)
  return remainingSeconds > 0 && remainingSeconds <= PRE_START_WARNING_THRESHOLD_SECONDS
}
