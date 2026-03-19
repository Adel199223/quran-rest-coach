import {
  DEFAULT_BREAK_TIERS,
  SETTINGS_SCHEMA_VERSION,
  type BreakTier,
  type TimerSettings,
  isBreakTier,
  isObjectLike,
} from './contracts'
import { DEFAULT_PRE_START_COUNTDOWN_SECONDS, normalizePreStartCountdownSeconds } from '../app/pendingStart'

export const DEFAULT_PACE_SECONDS_PER_TWO_PAGES = 130

function uniqueTierByEveryPages(tiers: BreakTier[]): BreakTier[] {
  const seen = new Set<number>()
  const result: BreakTier[] = []

  for (const tier of tiers) {
    if (seen.has(tier.everyPages)) {
      continue
    }

    seen.add(tier.everyPages)
    result.push(tier)
  }

  return result
}

export function normalizeBreakTiers(tiers: unknown): BreakTier[] {
  if (!Array.isArray(tiers)) {
    return [...DEFAULT_BREAK_TIERS]
  }

  const validTiers = tiers.filter((item): item is BreakTier => isBreakTier(item))

  if (validTiers.length === 0) {
    return [...DEFAULT_BREAK_TIERS]
  }

  const deduped = uniqueTierByEveryPages(validTiers)
  return deduped.sort((a, b) => b.everyPages - a.everyPages)
}

export function createDefaultTimerSettings(nowMs = Date.now()): TimerSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAtMs: nowMs,
    paceSecondsPerTwoPages: DEFAULT_PACE_SECONDS_PER_TWO_PAGES,
    breakTiers: normalizeBreakTiers(DEFAULT_BREAK_TIERS),
    showBetweenBreakCountdown: true,
    readingPressureMode: true,
    deadlineWarningCueEnabled: true,
    showRestCountdown: true,
    softChimeEnabled: true,
    preStartCountdownSeconds: DEFAULT_PRE_START_COUNTDOWN_SECONDS,
    preStartWarningCueEnabled: true,
    simplifiedReadingPanel: true,
    reducedMotion: false,
    largeText: true,
    highContrast: false,
    sepiaTheme: true,
    resumeOnReopen: true,
    locale: 'en',
  }
}

export function normalizeTimerSettings(
  value: unknown,
  nowMs = Date.now(),
): TimerSettings {
  const defaults = createDefaultTimerSettings(nowMs)

  if (!isObjectLike(value)) {
    return defaults
  }

  const paceInput = Number(value.paceSecondsPerTwoPages)
  const paceSecondsPerTwoPages =
    Number.isInteger(paceInput) && paceInput > 0
      ? paceInput
      : defaults.paceSecondsPerTwoPages

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAtMs: nowMs,
    paceSecondsPerTwoPages,
    breakTiers: normalizeBreakTiers(value.breakTiers),
    showBetweenBreakCountdown:
      typeof value.showBetweenBreakCountdown === 'boolean'
        ? value.showBetweenBreakCountdown
        : defaults.showBetweenBreakCountdown,
    readingPressureMode:
      typeof value.readingPressureMode === 'boolean'
        ? value.readingPressureMode
        : defaults.readingPressureMode,
    deadlineWarningCueEnabled:
      typeof value.deadlineWarningCueEnabled === 'boolean'
        ? value.deadlineWarningCueEnabled
        : defaults.deadlineWarningCueEnabled,
    showRestCountdown:
      typeof value.showRestCountdown === 'boolean'
        ? value.showRestCountdown
        : defaults.showRestCountdown,
    softChimeEnabled:
      typeof value.softChimeEnabled === 'boolean'
        ? value.softChimeEnabled
        : defaults.softChimeEnabled,
    preStartCountdownSeconds: normalizePreStartCountdownSeconds(value.preStartCountdownSeconds),
    preStartWarningCueEnabled:
      typeof value.preStartWarningCueEnabled === 'boolean'
        ? value.preStartWarningCueEnabled
        : defaults.preStartWarningCueEnabled,
    simplifiedReadingPanel:
      typeof value.simplifiedReadingPanel === 'boolean'
        ? value.simplifiedReadingPanel
        : defaults.simplifiedReadingPanel,
    reducedMotion:
      typeof value.reducedMotion === 'boolean'
        ? value.reducedMotion
        : defaults.reducedMotion,
    largeText: typeof value.largeText === 'boolean' ? value.largeText : defaults.largeText,
    highContrast:
      typeof value.highContrast === 'boolean'
        ? value.highContrast
        : defaults.highContrast,
    sepiaTheme:
      typeof value.sepiaTheme === 'boolean' ? value.sepiaTheme : defaults.sepiaTheme,
    resumeOnReopen:
      typeof value.resumeOnReopen === 'boolean'
        ? value.resumeOnReopen
        : defaults.resumeOnReopen,
    locale: typeof value.locale === 'string' && value.locale ? value.locale : defaults.locale,
  }
}
