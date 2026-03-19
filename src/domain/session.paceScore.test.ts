import { describe, expect, it } from 'vitest'

import type { ActiveSession, PaceWindowLogEntry } from './contracts'
import { createDefaultTimerSettings } from './settings'
import {
  addPages,
  advanceSessionTimers,
  endSession,
  snoozeReadingDeadline,
  startSession,
} from './session'

function createResolvedWindow(
  overrides: Partial<PaceWindowLogEntry> = {},
): PaceWindowLogEntry {
  return {
    mode: 'reading-window',
    targetStartPage: 0,
    targetEndPage: 2,
    targetPages: 2,
    breakKind: 'micro',
    breakDurationSeconds: 15,
    startedAtMs: 0,
    deadlineAtMs: 130_000,
    resolvedAtMs: 130_000,
    deadlineSnoozeCount: 0,
    missedDeadline: false,
    caughtUpDuringCatchUp: false,
    latePagesAtWindowStart: 0,
    latePagesAtWindowEnd: 0,
    caughtUpAtMs: null,
    recoveredSecondsRemaining: null,
    score: 0,
    ...overrides,
  }
}

function finalizeManualPressureSession(
  windows: PaceWindowLogEntry[],
  {
    currentPagesLate = 0,
    maxPagesLate = currentPagesLate,
    totalPages = 0,
    scheduledPages = totalPages + currentPagesLate,
    deadlineSnoozeCount = windows.reduce((sum, window) => sum + window.deadlineSnoozeCount, 0),
  }: {
    currentPagesLate?: number
    maxPagesLate?: number
    totalPages?: number
    scheduledPages?: number
    deadlineSnoozeCount?: number
  } = {},
) {
  const settings = createDefaultTimerSettings(0)
  const base = startSession(0, 'flow', settings)
  const session: ActiveSession = {
    ...base,
    status: 'reading',
    totalPages,
    scheduledPages,
    currentPagesLate,
    maxPagesLate,
    deadlineSnoozeCount,
    paceState: null,
    paceWindowLog: windows,
  }

  return endSession(session, 200_000).historyEntry
}

describe('pressure-mode pace score', () => {
  it('scores a clean on-time first window as a strong start', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const onTime = addPages(session, 2, settings, 1_000)
    const result = endSession(onTime, 2_000)

    expect(result.historyEntry?.paceScore).toBe(90)
    expect(result.historyEntry?.onTimeWindows).toBe(1)
    expect(result.historyEntry?.recoveredWindows).toBe(0)
    expect(result.historyEntry?.bestOnTimeStreak).toBe(1)
  })

  it('records catch-up recovery and preserved remaining seconds when a deadline is missed', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const catchUp = advanceSessionTimers(session, settings, 131_000)
    const recovered = addPages(catchUp, 2, settings, 140_000)
    const resolved = advanceSessionTimers(recovered, settings, 146_000)

    expect(recovered.paceState?.caughtUpAtMs).toBe(140_000)
    expect(resolved.recoveredWindows).toBe(1)
    expect(resolved.paceWindowLog[0]?.recoveredSecondsRemaining).toBe(6)
    expect(resolved.paceScore).toBe(60)
  })

  it('captures carried lateness at the start of the next pace window', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const catchUp = advanceSessionTimers(session, settings, 131_000)
    const resolved = advanceSessionTimers(catchUp, settings, 146_000)

    expect(resolved.currentPagesLate).toBe(2)
    expect(resolved.paceState?.latePagesAtWindowStart).toBe(2)
  })

  it('penalizes deadline snoozes without collapsing the score', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const finalTen = advanceSessionTimers(session, settings, 121_000)
    const snoozedOnce = snoozeReadingDeadline(finalTen, 121_000)
    const snoozedTwice = snoozeReadingDeadline(snoozedOnce, 131_000)
    const onTime = addPages(snoozedTwice, 2, settings, 140_000)
    const result = endSession(onTime, 141_000)

    expect(result.historyEntry?.deadlineSnoozeCount).toBe(2)
    expect(result.historyEntry?.paceScore).toBe(70)
  })

  it('weights larger pace windows more heavily in the final session score', () => {
    const historyEntry = finalizeManualPressureSession([
      createResolvedWindow({
        targetPages: 2,
        targetEndPage: 2,
      }),
      createResolvedWindow({
        targetStartPage: 2,
        targetEndPage: 7,
        targetPages: 5,
        breakKind: 'short',
        breakDurationSeconds: 60,
        missedDeadline: true,
        caughtUpDuringCatchUp: true,
        caughtUpAtMs: 300_000,
        recoveredSecondsRemaining: 12,
        resolvedAtMs: 360_000,
      }),
    ])

    expect(historyEntry?.paceScore).toBe(69)
    expect(historyEntry?.onTimeWindows).toBe(1)
    expect(historyEntry?.recoveredWindows).toBe(1)
    expect(historyEntry?.bestOnTimeStreak).toBe(1)
  })

  it('applies an ending-late penalty when the session finishes before catching back up', () => {
    const historyEntry = finalizeManualPressureSession(
      [
        createResolvedWindow({
          missedDeadline: true,
          latePagesAtWindowEnd: 2,
        }),
      ],
      {
        currentPagesLate: 2,
        maxPagesLate: 2,
        totalPages: 0,
        scheduledPages: 2,
      },
    )

    expect(historyEntry?.paceScore).toBe(22)
    expect(historyEntry?.endingLatePages).toBe(2)
  })

  it('keeps an untouched pressure session at 100 when no window resolves and nothing is late', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const result = endSession(session, 5_000)

    expect(result.historyEntry?.paceScore).toBe(100)
    expect(result.historyEntry?.paceWindowLog).toHaveLength(0)
  })
})
