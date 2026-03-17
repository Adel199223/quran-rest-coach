import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings, normalizeBreakTiers, normalizeTimerSettings } from './settings'

describe('settings normalization', () => {
  it('uses default settings when input is invalid', () => {
    const settings = normalizeTimerSettings(null, 1000)
    expect(settings.schemaVersion).toBe(1)
    expect(settings.paceSecondsPerTwoPages).toBe(130)
    expect(settings.breakTiers).toHaveLength(3)
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
      locale: 'en-GB',
    }
    const normalized = normalizeTimerSettings(input, 200)
    expect(normalized.paceSecondsPerTwoPages).toBe(145)
    expect(normalized.largeText).toBe(false)
    expect(normalized.locale).toBe('en-GB')
    expect(normalized.updatedAtMs).toBe(200)
  })
})
