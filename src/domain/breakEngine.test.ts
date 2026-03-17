import { describe, expect, it } from 'vitest'

import { resolveBreakForPageCount, getNextBreakHint, computeHybridNudge } from './breakEngine'
import { createDefaultTimerSettings } from './settings'
import { startSession } from './session'

describe('break engine', () => {
  it('applies 10/5/2 precedence without stacking', () => {
    const settings = createDefaultTimerSettings(0)
    expect(resolveBreakForPageCount(10, settings.breakTiers)?.durationSeconds).toBe(120)
    expect(resolveBreakForPageCount(5, settings.breakTiers)?.durationSeconds).toBe(60)
    expect(resolveBreakForPageCount(6, settings.breakTiers)?.durationSeconds).toBe(15)
    expect(resolveBreakForPageCount(1, settings.breakTiers)).toBeNull()
  })

  it('returns the next break hint from current page count', () => {
    const settings = createDefaultTimerSettings(0)
    const hint = getNextBreakHint(9, settings.breakTiers)
    expect(hint).not.toBeNull()
    expect(hint?.triggerPage).toBe(10)
    expect(hint?.pagesUntilBreak).toBe(1)
    expect(hint?.durationSeconds).toBe(120)
  })

  it('shows hybrid nudge when close to break and pace is overdue', () => {
    const settings = createDefaultTimerSettings(0)
    const session = {
      ...startSession(0),
      totalPages: 9,
      lastPageLoggedAtMs: 0,
    }
    const nudge = computeHybridNudge(session, settings, 90_000)
    expect(nudge).not.toBeNull()
    expect(nudge?.message).toBe('Break due soon when you finish this page.')
    expect(nudge?.pagesUntilBreak).toBe(1)
  })
})
