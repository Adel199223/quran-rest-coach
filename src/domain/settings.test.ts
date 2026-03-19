import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings, normalizeBreakTiers, normalizeTimerSettings } from './settings'

describe('settings normalization', () => {
  it('uses default settings when input is invalid', () => {
    const settings = normalizeTimerSettings(null, 1000)
    expect(settings.schemaVersion).toBe(7)
    expect(settings.paceSecondsPerTwoPages).toBe(130)
    expect(settings.breakTiers).toHaveLength(3)
    expect(settings.showBetweenBreakCountdown).toBe(true)
    expect(settings.readingPressureMode).toBe(true)
    expect(settings.deadlineWarningCueEnabled).toBe(true)
    expect(settings.showRestCountdown).toBe(true)
    expect(settings.softChimeEnabled).toBe(true)
    expect(settings.preStartCountdownSeconds).toBe(10)
    expect(settings.preStartWarningCueEnabled).toBe(true)
    expect(settings.simplifiedReadingPanel).toBe(true)
    expect(settings.updatedAtMs).toBe(1000)
  })

  it('sorts and de-duplicates break tiers by everyPages descending', () => {
    const tiers = normalizeBreakTiers([
      { everyPages: 2, durationSeconds: 15, kind: 'micro' },
      { everyPages: 10, durationSeconds: 120, kind: 'long' },
      { everyPages: 5, durationSeconds: 60, kind: 'short' },
      { everyPages: 5, durationSeconds: 40, kind: 'short' },
    ])
    expect(tiers.map((tier) => tier.everyPages)).toEqual([10, 5, 2])
    expect(tiers[1].durationSeconds).toBe(60)
  })

  it('keeps valid incoming settings values', () => {
    const defaults = createDefaultTimerSettings(100)
    const input = {
      ...defaults,
      paceSecondsPerTwoPages: 145,
      largeText: false,
      showBetweenBreakCountdown: true,
      readingPressureMode: true,
      showRestCountdown: true,
      preStartCountdownSeconds: 6,
      preStartWarningCueEnabled: false,
      simplifiedReadingPanel: false,
      locale: 'en-GB',
    }
    const normalized = normalizeTimerSettings(input, 200)
    expect(normalized.paceSecondsPerTwoPages).toBe(145)
    expect(normalized.largeText).toBe(false)
    expect(normalized.showBetweenBreakCountdown).toBe(true)
    expect(normalized.readingPressureMode).toBe(true)
    expect(normalized.showRestCountdown).toBe(true)
    expect(normalized.preStartCountdownSeconds).toBe(6)
    expect(normalized.preStartWarningCueEnabled).toBe(false)
    expect(normalized.simplifiedReadingPanel).toBe(false)
    expect(normalized.locale).toBe('en-GB')
    expect(normalized.updatedAtMs).toBe(200)
  })
})
