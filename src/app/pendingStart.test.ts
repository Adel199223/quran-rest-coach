import { describe, expect, it } from 'vitest'

import {
  createPendingStartCountdown,
  getPendingStartRemainingSeconds,
  isPendingStartWarningPhase,
  normalizePreStartCountdownSeconds,
} from './pendingStart'

describe('pending start countdown helpers', () => {
  it('normalizes countdown seconds into the supported range', () => {
    expect(normalizePreStartCountdownSeconds(undefined)).toBe(10)
    expect(normalizePreStartCountdownSeconds(-5)).toBe(0)
    expect(normalizePreStartCountdownSeconds(14.9)).toBe(14)
    expect(normalizePreStartCountdownSeconds(99)).toBe(60)
  })

  it('creates a pending start countdown only when the delay is greater than zero', () => {
    expect(createPendingStartCountdown('flow', 0, 1_000)).toBeNull()
    expect(createPendingStartCountdown('flow', 5, 1_000)).toEqual({
      intent: 'flow',
      durationSeconds: 5,
      startedAtMs: 1_000,
      endsAtMs: 6_000,
    })
  })

  it('derives remaining seconds and the warning phase from the seeded countdown', () => {
    const pendingStart = createPendingStartCountdown('recover-focus', 10, 1_000)
    if (!pendingStart) {
      throw new Error('Expected a pending start countdown.')
    }

    expect(getPendingStartRemainingSeconds(pendingStart, 6_100)).toBe(5)
    expect(isPendingStartWarningPhase(pendingStart, 6_100)).toBe(false)
    expect(getPendingStartRemainingSeconds(pendingStart, 8_100)).toBe(3)
    expect(isPendingStartWarningPhase(pendingStart, 8_100)).toBe(true)
    expect(getPendingStartRemainingSeconds(pendingStart, 11_100)).toBe(0)
  })
})
