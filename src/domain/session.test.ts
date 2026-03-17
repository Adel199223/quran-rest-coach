import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings } from './settings'
import {
  addPages,
  endSession,
  pauseSession,
  resumeSession,
  skipBreak,
  snoozeBreak,
  startSession,
  undoLastPages,
  advanceBreakTimer,
} from './session'

describe('session helpers', () => {
  it('starts a new session in reading state', () => {
    const session = startSession(100)
    expect(session.status).toBe('reading')
    expect(session.totalPages).toBe(0)
    expect(session.startedAtMs).toBe(100)
  })

  it('adds pages and triggers a break at 2 pages', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)
    const next = addPages(session, 2, settings, 1000)
    expect(next.totalPages).toBe(2)
    expect(next.status).toBe('break')
    expect(next.activeBreak?.durationSeconds).toBe(15)
  })

  it('supports snooze and skip during break', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 2, settings, 1000)
    const snoozed = snoozeBreak(session, 30, 1010)
    expect(snoozed.snoozeCount).toBe(1)
    expect(snoozed.activeBreak?.endsAtMs).toBeGreaterThan(session.activeBreak?.endsAtMs ?? 0)

    const skipped = skipBreak(snoozed, settings, 1030)
    expect(skipped.status).toBe('reading')
    expect(skipped.skippedBreaks).toBe(1)
    expect(skipped.activeBreak).toBeNull()
  })

  it('undoes last page addition and removes pending break if needed', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 2, settings, 1000)
    const undone = undoLastPages(session, settings, 1100)
    expect(undone.totalPages).toBe(0)
    expect(undone.status).toBe('reading')
    expect(undone.breakLog).toHaveLength(0)
    expect(undone.activeBreak).toBeNull()
  })

  it('supports pause and resume around reading state', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)
    const paused = pauseSession(session, 1000)
    expect(paused.status).toBe('paused')
    const resumed = resumeSession(paused, settings, 1100)
    expect(resumed.status).toBe('reading')
  })

  it('auto-completes break when timer elapses', () => {
    const settings = createDefaultTimerSettings(0)
    const session = addPages(startSession(0), 2, settings, 1000)
    const advanced = advanceBreakTimer(session, settings, 20_000)
    expect(advanced.status).toBe('reading')
    expect(advanced.breaksTaken).toBe(1)
  })

  it('ends session and returns a history entry', () => {
    const settings = createDefaultTimerSettings(0)
    const withBreak = addPages(startSession(0), 2, settings, 1000)
    const afterResume = resumeSession(withBreak, settings, 1020)
    const result = endSession(afterResume, 5000)
    expect(result.session.status).toBe('idle')
    expect(result.historyEntry).not.toBeNull()
    expect(result.historyEntry?.breaksTaken).toBe(1)
    expect(result.historyEntry?.totalPages).toBe(2)
  })
})
