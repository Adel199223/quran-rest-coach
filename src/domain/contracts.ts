export const SETTINGS_SCHEMA_VERSION = 1 as const
export const ACTIVE_SESSION_SCHEMA_VERSION = 1 as const
export const SESSION_HISTORY_SCHEMA_VERSION = 1 as const

export type SessionStatus = 'idle' | 'reading' | 'break' | 'paused'
export type BreakKind = 'micro' | 'short' | 'long'

export interface BreakTier {
  everyPages: number
  durationSeconds: number
  kind: BreakKind
}

export interface TimerSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION
  updatedAtMs: number
  paceSecondsPerTwoPages: number
  breakTiers: BreakTier[]
  softChimeEnabled: boolean
  reducedMotion: boolean
  largeText: boolean
  highContrast: boolean
  sepiaTheme: boolean
  resumeOnReopen: boolean
  locale: string
}

export interface PageEvent {
  atMs: number
  deltaPages: number
  totalPages: number
}

export interface HybridNudge {
  message: string
  overdueSeconds: number
  pagesUntilBreak: number
}

export interface ActiveBreakState {
  kind: BreakKind
  triggerEveryPages: number
  triggerPage: number
  durationSeconds: number
  startedAtMs: number
  endsAtMs: number
  snoozedUntilMs: number | null
}

export interface BreakLogEntry {
  kind: BreakKind
  triggerEveryPages: number
  triggerPage: number
  durationSeconds: number
  triggeredAtMs: number
  completedAtMs: number | null
  snoozeCount: number
  skipped: boolean
}

export interface ActiveSession {
  schemaVersion: typeof ACTIVE_SESSION_SCHEMA_VERSION
  sessionId: string
  status: SessionStatus
  startedAtMs: number
  updatedAtMs: number
  endedAtMs: number | null
  totalPages: number
  pageEvents: PageEvent[]
  lastPageLoggedAtMs: number | null
  activeBreak: ActiveBreakState | null
  breakLog: BreakLogEntry[]
  breaksTaken: number
  snoozeCount: number
  skippedBreaks: number
  hybridNudge: HybridNudge | null
}

export interface SessionHistoryEntry {
  schemaVersion: typeof SESSION_HISTORY_SCHEMA_VERSION
  sessionId: string
  startedAtMs: number
  endedAtMs: number
  totalPages: number
  breaksTaken: number
  snoozeCount: number
  skippedBreaks: number
  breakLog: BreakLogEntry[]
}

export const DEFAULT_BREAK_TIERS: BreakTier[] = [
  { everyPages: 2, durationSeconds: 15, kind: 'micro' },
  { everyPages: 5, durationSeconds: 60, kind: 'short' },
  { everyPages: 10, durationSeconds: 120, kind: 'long' },
]

export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isBreakKind(value: unknown): value is BreakKind {
  return value === 'micro' || value === 'short' || value === 'long'
}

export function isBreakTier(value: unknown): value is BreakTier {
  if (!isObjectLike(value)) {
    return false
  }

  return (
    Number.isInteger(value.everyPages) &&
    Number(value.everyPages) > 0 &&
    Number.isInteger(value.durationSeconds) &&
    Number(value.durationSeconds) > 0 &&
    isBreakKind(value.kind)
  )
}

export function isTimerSettings(value: unknown): value is TimerSettings {
  if (!isObjectLike(value)) {
    return false
  }

  return (
    value.schemaVersion === SETTINGS_SCHEMA_VERSION &&
    Number.isFinite(value.updatedAtMs) &&
    Number.isInteger(value.paceSecondsPerTwoPages) &&
    Number(value.paceSecondsPerTwoPages) > 0 &&
    Array.isArray(value.breakTiers) &&
    value.breakTiers.every(isBreakTier) &&
    typeof value.softChimeEnabled === 'boolean' &&
    typeof value.reducedMotion === 'boolean' &&
    typeof value.largeText === 'boolean' &&
    typeof value.highContrast === 'boolean' &&
    typeof value.sepiaTheme === 'boolean' &&
    typeof value.resumeOnReopen === 'boolean' &&
    typeof value.locale === 'string'
  )
}

function isPageEvent(value: unknown): value is PageEvent {
  if (!isObjectLike(value)) {
    return false
  }

  return (
    Number.isFinite(value.atMs) &&
    Number.isInteger(value.deltaPages) &&
    Number(value.deltaPages) > 0 &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0
  )
}

function isHybridNudge(value: unknown): value is HybridNudge {
  if (!isObjectLike(value)) {
    return false
  }

  return (
    typeof value.message === 'string' &&
    Number.isInteger(value.overdueSeconds) &&
    Number(value.overdueSeconds) >= 0 &&
    Number.isInteger(value.pagesUntilBreak) &&
    Number(value.pagesUntilBreak) >= 1
  )
}

function isActiveBreakState(value: unknown): value is ActiveBreakState {
  if (!isObjectLike(value)) {
    return false
  }

  const hasValidSnooze =
    value.snoozedUntilMs === null || Number.isFinite(value.snoozedUntilMs)

  return (
    isBreakKind(value.kind) &&
    Number.isInteger(value.triggerEveryPages) &&
    Number(value.triggerEveryPages) > 0 &&
    Number.isInteger(value.triggerPage) &&
    Number(value.triggerPage) > 0 &&
    Number.isInteger(value.durationSeconds) &&
    Number(value.durationSeconds) > 0 &&
    Number.isFinite(value.startedAtMs) &&
    Number.isFinite(value.endsAtMs) &&
    hasValidSnooze
  )
}

function isBreakLogEntry(value: unknown): value is BreakLogEntry {
  if (!isObjectLike(value)) {
    return false
  }

  const completedAtValid =
    value.completedAtMs === null || Number.isFinite(value.completedAtMs)

  return (
    isBreakKind(value.kind) &&
    Number.isInteger(value.triggerEveryPages) &&
    Number(value.triggerEveryPages) > 0 &&
    Number.isInteger(value.triggerPage) &&
    Number(value.triggerPage) > 0 &&
    Number.isInteger(value.durationSeconds) &&
    Number(value.durationSeconds) > 0 &&
    Number.isFinite(value.triggeredAtMs) &&
    completedAtValid &&
    Number.isInteger(value.snoozeCount) &&
    Number(value.snoozeCount) >= 0 &&
    typeof value.skipped === 'boolean'
  )
}

export function isActiveSession(value: unknown): value is ActiveSession {
  if (!isObjectLike(value)) {
    return false
  }

  const activeBreakValid =
    value.activeBreak === null || isActiveBreakState(value.activeBreak)
  const nudgeValid = value.hybridNudge === null || isHybridNudge(value.hybridNudge)

  return (
    value.schemaVersion === ACTIVE_SESSION_SCHEMA_VERSION &&
    typeof value.sessionId === 'string' &&
    (value.status === 'idle' ||
      value.status === 'reading' ||
      value.status === 'break' ||
      value.status === 'paused') &&
    Number.isFinite(value.startedAtMs) &&
    Number.isFinite(value.updatedAtMs) &&
    (value.endedAtMs === null || Number.isFinite(value.endedAtMs)) &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0 &&
    Array.isArray(value.pageEvents) &&
    value.pageEvents.every(isPageEvent) &&
    (value.lastPageLoggedAtMs === null || Number.isFinite(value.lastPageLoggedAtMs)) &&
    activeBreakValid &&
    Array.isArray(value.breakLog) &&
    value.breakLog.every(isBreakLogEntry) &&
    Number.isInteger(value.breaksTaken) &&
    Number(value.breaksTaken) >= 0 &&
    Number.isInteger(value.snoozeCount) &&
    Number(value.snoozeCount) >= 0 &&
    Number.isInteger(value.skippedBreaks) &&
    Number(value.skippedBreaks) >= 0 &&
    nudgeValid
  )
}

export function isSessionHistoryEntry(value: unknown): value is SessionHistoryEntry {
  if (!isObjectLike(value)) {
    return false
  }

  return (
    value.schemaVersion === SESSION_HISTORY_SCHEMA_VERSION &&
    typeof value.sessionId === 'string' &&
    Number.isFinite(value.startedAtMs) &&
    Number.isFinite(value.endedAtMs) &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0 &&
    Number.isInteger(value.breaksTaken) &&
    Number(value.breaksTaken) >= 0 &&
    Number.isInteger(value.snoozeCount) &&
    Number(value.snoozeCount) >= 0 &&
    Number.isInteger(value.skippedBreaks) &&
    Number(value.skippedBreaks) >= 0 &&
    Array.isArray(value.breakLog) &&
    value.breakLog.every(isBreakLogEntry)
  )
}
