import {
  ACTIVE_SESSION_SCHEMA_VERSION,
  SESSION_HISTORY_SCHEMA_VERSION,
  type ActiveBreakState,
  type ActiveSession,
  type BreakLogEntry,
  type ObservedReaderPage,
  type PaceState,
  type PaceWindowLogEntry,
  type ReadingIntent,
  type SessionHistoryEntry,
  type TimerSettings,
} from './contracts'
import { computeHybridNudge, getNextBreakHint, resolveBreakForPageCount } from './breakEngine'

const DEADLINE_SNOOZE_SECONDS = 10
const FINAL_TEN_WINDOW_SECONDS = 10

function createSessionId(nowMs: number): string {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `session_${nowMs}_${randomPart}`
}

function cloneWithUpdate(
  session: ActiveSession,
  updates: Partial<ActiveSession>,
  nowMs: number,
): ActiveSession {
  return {
    ...session,
    ...updates,
    updatedAtMs: nowMs,
  }
}

function updateLatestBreakLog(
  breakLog: BreakLogEntry[],
  updater: (entry: BreakLogEntry) => BreakLogEntry,
): BreakLogEntry[] {
  if (breakLog.length === 0) {
    return breakLog
  }

  const next = [...breakLog]
  next[next.length - 1] = updater(next[next.length - 1])
  return next
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

interface DerivedPaceWindowMetrics {
  paceWindowLog: PaceWindowLogEntry[]
  onTimeWindows: number
  recoveredWindows: number
  currentOnTimeStreak: number
  bestOnTimeStreak: number
}

function getLatePagesFromScheduled(scheduledPages: number, totalPages: number): number {
  return Math.max(0, scheduledPages - totalPages)
}

function computeWindowScore(window: PaceWindowLogEntry, onTimeStreak: number): number {
  const score =
    7 +
    (window.missedDeadline ? 0 : 2) +
    (window.caughtUpDuringCatchUp ? 1 : 0) +
    (window.latePagesAtWindowEnd < window.latePagesAtWindowStart ? 1 : 0) +
    (!window.missedDeadline && onTimeStreak >= 2 ? 1 : 0) -
    Math.min(2, window.deadlineSnoozeCount) -
    (window.missedDeadline ? 2 : 0) -
    Math.min(3, window.latePagesAtWindowEnd)

  return clamp(Math.round(score), 0, 10)
}

function derivePaceWindowMetrics(windows: PaceWindowLogEntry[]): DerivedPaceWindowMetrics {
  let onTimeWindows = 0
  let recoveredWindows = 0
  let currentOnTimeStreak = 0
  let bestOnTimeStreak = 0

  const paceWindowLog = windows.map((window) => {
    if (!window.missedDeadline) {
      currentOnTimeStreak += 1
      onTimeWindows += 1
    } else {
      currentOnTimeStreak = 0
    }

    if (window.caughtUpDuringCatchUp) {
      recoveredWindows += 1
    }

    bestOnTimeStreak = Math.max(bestOnTimeStreak, currentOnTimeStreak)

    return {
      ...window,
      score: computeWindowScore(window, currentOnTimeStreak),
    }
  })

  return {
    paceWindowLog,
    onTimeWindows,
    recoveredWindows,
    currentOnTimeStreak,
    bestOnTimeStreak,
  }
}

function computePaceScore(scoredWindows: PaceWindowLogEntry[], endingLatePages: number): number {
  const endingLatePenalty = Math.min(12, endingLatePages * 4)

  if (scoredWindows.length === 0) {
    return clamp(100 - endingLatePenalty, 0, 100)
  }

  const totalWeight = scoredWindows.reduce((sum, window) => sum + window.targetPages * 10, 0)
  if (totalWeight <= 0) {
    return clamp(100 - endingLatePenalty, 0, 100)
  }

  const weightedPoints = scoredWindows.reduce(
    (sum, window) => sum + window.score * window.targetPages,
    0,
  )
  const normalized = Math.round((weightedPoints / totalWeight) * 100)
  return clamp(normalized - endingLatePenalty, 0, 100)
}

function createPaceState(
  scheduledPages: number,
  settings: TimerSettings,
  nowMs: number,
  latePagesAtWindowStart = 0,
): PaceState | null {
  const hint = getNextBreakHint(scheduledPages, settings.breakTiers)
  if (!hint) {
    return null
  }

  const originalDurationSeconds = Math.max(
    1,
    Math.ceil(hint.pagesUntilBreak * (settings.paceSecondsPerTwoPages / 2)),
  )

  return {
    targetStartPage: scheduledPages,
    targetEndPage: hint.triggerPage,
    targetPages: hint.pagesUntilBreak,
    breakKind: hint.kind,
    breakDurationSeconds: hint.durationSeconds,
    startedAtMs: nowMs,
    deadlineAtMs: nowMs + originalDurationSeconds * 1000,
    originalDurationSeconds,
    deadlineSnoozeCount: 0,
    latePagesAtWindowStart: Math.max(0, latePagesAtWindowStart),
    caughtUpAtMs: null,
    catchUpEndsAtMs: null,
  }
}

function withDerivedMetrics(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  const lateReference =
    session.paceState?.catchUpEndsAtMs != null
      ? session.paceState.targetEndPage
      : session.scheduledPages
  const currentPagesLate = Math.max(0, lateReference - session.totalPages)
  const maxPagesLate = Math.max(session.maxPagesLate, currentPagesLate)
  const paceWindowMetrics = derivePaceWindowMetrics(session.paceWindowLog)
  const hybridNudge =
    session.pressureModeEnabled || session.status !== 'reading'
      ? null
      : computeHybridNudge(session, settings, nowMs)

  return {
    ...session,
    currentPagesLate,
    maxPagesLate,
    onTimeWindows: paceWindowMetrics.onTimeWindows,
    recoveredWindows: paceWindowMetrics.recoveredWindows,
    currentOnTimeStreak: paceWindowMetrics.currentOnTimeStreak,
    bestOnTimeStreak: Math.max(session.bestOnTimeStreak, paceWindowMetrics.bestOnTimeStreak),
    paceWindowLog: paceWindowMetrics.paceWindowLog,
    paceScore: computePaceScore(paceWindowMetrics.paceWindowLog, currentPagesLate),
    hybridNudge,
  }
}

function buildPaceWindowLogEntry(
  paceState: PaceState,
  nowMs: number,
  missedDeadline: boolean,
  caughtUpDuringCatchUp: boolean,
  latePagesAtWindowEnd: number,
): PaceWindowLogEntry {
  const recoveredSecondsRemaining =
    paceState.catchUpEndsAtMs !== null && paceState.caughtUpAtMs !== null
      ? Math.max(0, Math.ceil((paceState.catchUpEndsAtMs - paceState.caughtUpAtMs) / 1000))
      : null

  return {
    mode: paceState.catchUpEndsAtMs !== null ? 'catch-up-window' : 'reading-window',
    targetStartPage: paceState.targetStartPage,
    targetEndPage: paceState.targetEndPage,
    targetPages: paceState.targetPages,
    breakKind: paceState.breakKind,
    breakDurationSeconds: paceState.breakDurationSeconds,
    startedAtMs: paceState.startedAtMs,
    deadlineAtMs: paceState.deadlineAtMs,
    resolvedAtMs: nowMs,
    deadlineSnoozeCount: paceState.deadlineSnoozeCount,
    missedDeadline,
    caughtUpDuringCatchUp,
    latePagesAtWindowStart: paceState.latePagesAtWindowStart,
    latePagesAtWindowEnd,
    caughtUpAtMs: paceState.caughtUpAtMs,
    recoveredSecondsRemaining,
    score: 0,
  }
}

function createEarnedBreakState(paceState: PaceState, nowMs: number): ActiveBreakState {
  return {
    kind: paceState.breakKind,
    triggerEveryPages: paceState.targetPages,
    triggerPage: paceState.targetEndPage,
    durationSeconds: paceState.breakDurationSeconds,
    startedAtMs: nowMs,
    endsAtMs: nowMs + paceState.breakDurationSeconds * 1000,
    snoozedUntilMs: null,
  }
}

function resolvePressureBreakOnTime(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (!session.paceState) {
    return withDerivedMetrics(session, settings, nowMs)
  }

  const paceWindowLog = [
    ...session.paceWindowLog,
    buildPaceWindowLogEntry(session.paceState, nowMs, false, false, 0),
  ]
  const activeBreak = createEarnedBreakState(session.paceState, nowMs)
  const breakLogEntry: BreakLogEntry = {
    kind: session.paceState.breakKind,
    triggerEveryPages: session.paceState.targetPages,
    triggerPage: session.paceState.targetEndPage,
    durationSeconds: session.paceState.breakDurationSeconds,
    triggeredAtMs: nowMs,
    completedAtMs: null,
    snoozeCount: 0,
    skipped: false,
  }

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        status: 'break',
        activeBreak,
        breakLog: [...session.breakLog, breakLogEntry],
        scheduledPages: session.paceState.targetEndPage,
        paceState: null,
        paceWindowLog,
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

function beginCatchUpWindow(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (!session.paceState) {
    return withDerivedMetrics(session, settings, nowMs)
  }

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        paceState: {
          ...session.paceState,
          catchUpEndsAtMs: nowMs + session.paceState.breakDurationSeconds * 1000,
        },
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

function resolveCatchUpWindow(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (!session.paceState || session.paceState.catchUpEndsAtMs === null) {
    return withDerivedMetrics(session, settings, nowMs)
  }

  const latePagesAtWindowEnd = Math.max(0, session.paceState.targetEndPage - session.totalPages)
  const caughtUpDuringCatchUp = session.paceState.caughtUpAtMs !== null
  const paceWindowLog = [
    ...session.paceWindowLog,
    buildPaceWindowLogEntry(
      session.paceState,
      nowMs,
      true,
      caughtUpDuringCatchUp,
      latePagesAtWindowEnd,
    ),
  ]
  const scheduledPages = session.paceState.targetEndPage
  const nextPaceState = createPaceState(
    scheduledPages,
    settings,
    nowMs,
    latePagesAtWindowEnd,
  )

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        scheduledPages,
        paceState: nextPaceState,
        paceWindowLog,
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

function finalizeCurrentPaceWindow(
  session: ActiveSession,
  nowMs: number,
): Pick<
  ActiveSession,
  | 'paceWindowLog'
  | 'scheduledPages'
  | 'currentPagesLate'
  | 'maxPagesLate'
  | 'paceScore'
  | 'onTimeWindows'
  | 'recoveredWindows'
  | 'currentOnTimeStreak'
  | 'bestOnTimeStreak'
> {
  const defaultMetrics = derivePaceWindowMetrics(session.paceWindowLog)
  if (!session.paceState) {
    return {
      paceWindowLog: defaultMetrics.paceWindowLog,
      scheduledPages: session.scheduledPages,
      currentPagesLate: session.currentPagesLate,
      maxPagesLate: session.maxPagesLate,
      paceScore: computePaceScore(defaultMetrics.paceWindowLog, session.currentPagesLate),
      onTimeWindows: defaultMetrics.onTimeWindows,
      recoveredWindows: defaultMetrics.recoveredWindows,
      currentOnTimeStreak: defaultMetrics.currentOnTimeStreak,
      bestOnTimeStreak: Math.max(session.bestOnTimeStreak, defaultMetrics.bestOnTimeStreak),
    }
  }

  const missedDeadline =
    session.paceState.catchUpEndsAtMs !== null ||
    (nowMs >= session.paceState.deadlineAtMs &&
      session.totalPages < session.paceState.targetEndPage)
  if (!missedDeadline) {
    return {
      paceWindowLog: defaultMetrics.paceWindowLog,
      scheduledPages: session.scheduledPages,
      currentPagesLate: session.currentPagesLate,
      maxPagesLate: session.maxPagesLate,
      paceScore: computePaceScore(defaultMetrics.paceWindowLog, session.currentPagesLate),
      onTimeWindows: defaultMetrics.onTimeWindows,
      recoveredWindows: defaultMetrics.recoveredWindows,
      currentOnTimeStreak: defaultMetrics.currentOnTimeStreak,
      bestOnTimeStreak: Math.max(session.bestOnTimeStreak, defaultMetrics.bestOnTimeStreak),
    }
  }

  const latePagesAtWindowEnd = Math.max(0, session.paceState.targetEndPage - session.totalPages)
  const paceWindowLog = [
    ...session.paceWindowLog,
    buildPaceWindowLogEntry(
      session.paceState,
      nowMs,
      true,
      latePagesAtWindowEnd === 0,
      latePagesAtWindowEnd,
    ),
  ]
  const scheduledPages = session.paceState.targetEndPage
  const currentPagesLate = Math.max(0, scheduledPages - session.totalPages)
  const maxPagesLate = Math.max(session.maxPagesLate, currentPagesLate)
  const derivedMetrics = derivePaceWindowMetrics(paceWindowLog)

  return {
    paceWindowLog: derivedMetrics.paceWindowLog,
    scheduledPages,
    currentPagesLate,
    maxPagesLate,
    paceScore: computePaceScore(derivedMetrics.paceWindowLog, currentPagesLate),
    onTimeWindows: derivedMetrics.onTimeWindows,
    recoveredWindows: derivedMetrics.recoveredWindows,
    currentOnTimeStreak: derivedMetrics.currentOnTimeStreak,
    bestOnTimeStreak: Math.max(session.bestOnTimeStreak, derivedMetrics.bestOnTimeStreak),
  }
}

function completeBreak(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (session.status !== 'break' || !session.activeBreak) {
    return withDerivedMetrics(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    completedAtMs: nowMs,
  }))
  const nextPaceState =
    session.pressureModeEnabled && session.paceState === null
      ? createPaceState(
          session.scheduledPages,
          settings,
          nowMs,
          getLatePagesFromScheduled(session.scheduledPages, session.totalPages),
        )
      : session.paceState

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        status: 'reading',
        activeBreak: null,
        breakLog,
        breaksTaken: session.breaksTaken + 1,
        paceState: nextPaceState,
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

function finalizeBreakIfStillOpen(
  session: ActiveSession,
  nowMs: number,
): Pick<ActiveSession, 'breakLog' | 'skippedBreaks'> {
  if (!session.activeBreak) {
    return {
      breakLog: session.breakLog,
      skippedBreaks: session.skippedBreaks,
    }
  }

  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    skipped: true,
    completedAtMs: entry.completedAtMs ?? nowMs,
  }))

  return {
    breakLog,
    skippedBreaks: session.skippedBreaks + 1,
  }
}

function applyCalmPageProgress(
  session: ActiveSession,
  deltaPages: number,
  settings: TimerSettings,
  nowMs: number,
  pageEvent: ActiveSession['pageEvents'][number],
  observedPages = session.observedPages,
): ActiveSession {
  const totalPages = session.totalPages + deltaPages
  const pageEvents = [
    ...session.pageEvents,
    {
      ...pageEvent,
      totalPages,
    },
  ]
  const decision = resolveBreakForPageCount(totalPages, settings.breakTiers)

  if (!decision) {
    return withDerivedMetrics(
      cloneWithUpdate(
        session,
        {
          totalPages,
          pageEvents,
          lastPageLoggedAtMs: nowMs,
          observedPages,
        },
        nowMs,
      ),
      settings,
      nowMs,
    )
  }

  const activeBreak: ActiveBreakState = {
    kind: decision.kind,
    triggerEveryPages: decision.triggerEveryPages,
    triggerPage: totalPages,
    durationSeconds: decision.durationSeconds,
    startedAtMs: nowMs,
    endsAtMs: nowMs + decision.durationSeconds * 1000,
    snoozedUntilMs: null,
  }

  const breakLogEntry: BreakLogEntry = {
    kind: decision.kind,
    triggerEveryPages: decision.triggerEveryPages,
    triggerPage: totalPages,
    durationSeconds: decision.durationSeconds,
    triggeredAtMs: nowMs,
    completedAtMs: null,
    snoozeCount: 0,
    skipped: false,
  }

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        status: 'break',
        totalPages,
        pageEvents,
        lastPageLoggedAtMs: nowMs,
        activeBreak,
        breakLog: [...session.breakLog, breakLogEntry],
        observedPages,
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

function applyPressurePageProgress(
  session: ActiveSession,
  deltaPages: number,
  settings: TimerSettings,
  nowMs: number,
  pageEvent: ActiveSession['pageEvents'][number],
  observedPages = session.observedPages,
): ActiveSession {
  const advanced = advanceSessionTimers(session, settings, nowMs)
  if (advanced.status !== 'reading') {
    return withDerivedMetrics(advanced, settings, nowMs)
  }

  const totalPages = advanced.totalPages + deltaPages
  const pageEvents = [
    ...advanced.pageEvents,
    {
      ...pageEvent,
      totalPages,
    },
  ]
  const updated = cloneWithUpdate(
    advanced,
    {
      totalPages,
      pageEvents,
      lastPageLoggedAtMs: nowMs,
      observedPages,
    },
    nowMs,
  )

  if (updated.paceState && totalPages >= updated.paceState.targetEndPage) {
    if (updated.paceState.catchUpEndsAtMs === null) {
      return resolvePressureBreakOnTime(updated, settings, nowMs)
    }

    return withDerivedMetrics(
      cloneWithUpdate(
        updated,
        {
          paceState: {
            ...updated.paceState,
            caughtUpAtMs: updated.paceState.caughtUpAtMs ?? nowMs,
          },
        },
        nowMs,
      ),
      settings,
      nowMs,
    )
  }

  return withDerivedMetrics(updated, settings, nowMs)
}

function toHistoryEntry(session: ActiveSession, endedAtMs: number): SessionHistoryEntry {
  const missedBreakWindows = session.paceWindowLog.filter((entry) => entry.missedDeadline).length

  return {
    schemaVersion: SESSION_HISTORY_SCHEMA_VERSION,
    sessionId: session.sessionId,
    readingIntent: session.readingIntent,
    pressureModeEnabled: session.pressureModeEnabled,
    startedAtMs: session.startedAtMs,
    endedAtMs,
    totalPages: session.totalPages,
    breaksTaken: session.breaksTaken,
    snoozeCount: session.snoozeCount,
    deadlineSnoozeCount: session.deadlineSnoozeCount,
    skippedBreaks: session.skippedBreaks,
    breakLog: session.breakLog,
    observedPages: session.observedPages,
    maxPagesLate: session.maxPagesLate,
    endingLatePages: session.currentPagesLate,
    missedBreakWindows,
    onTimeWindows: session.onTimeWindows,
    recoveredWindows: session.recoveredWindows,
    currentOnTimeStreak: session.currentOnTimeStreak,
    bestOnTimeStreak: session.bestOnTimeStreak,
    paceWindowLog: session.paceWindowLog,
    paceScore: session.paceScore,
  }
}

export function createActiveSession(
  nowMs = Date.now(),
  readingIntent: ReadingIntent = 'flow',
  settings?: TimerSettings,
): ActiveSession {
  const pressureModeEnabled = Boolean(settings?.readingPressureMode)
  const paceState =
    pressureModeEnabled && settings ? createPaceState(0, settings, nowMs, 0) : null

  return {
    schemaVersion: ACTIVE_SESSION_SCHEMA_VERSION,
    sessionId: createSessionId(nowMs),
    readingIntent,
    pressureModeEnabled,
    status: 'reading',
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
    endedAtMs: null,
    totalPages: 0,
    pageEvents: [],
    lastPageLoggedAtMs: null,
    activeBreak: null,
    breakLog: [],
    breaksTaken: 0,
    snoozeCount: 0,
    deadlineSnoozeCount: 0,
    skippedBreaks: 0,
    hybridNudge: null,
    observedPages: [],
    scheduledPages: 0,
    currentPagesLate: 0,
    maxPagesLate: 0,
    onTimeWindows: 0,
    recoveredWindows: 0,
    currentOnTimeStreak: 0,
    bestOnTimeStreak: 0,
    paceState,
    paceWindowLog: [],
    paceScore: 100,
  }
}

export function startSession(
  nowMs = Date.now(),
  readingIntent: ReadingIntent = 'flow',
  settings?: TimerSettings,
): ActiveSession {
  return createActiveSession(nowMs, readingIntent, settings)
}

export function addPages(
  session: ActiveSession,
  pagesToAdd: number,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  const deltaPages = Math.trunc(pagesToAdd)
  if (deltaPages <= 0) {
    return advanceSessionTimers(session, settings, nowMs)
  }

  if (session.status !== 'reading') {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const pageEvent = {
    atMs: nowMs,
    deltaPages,
    totalPages: session.totalPages + deltaPages,
    source: 'manual' as const,
    readerPageNumber: null,
    readerVerseKey: null,
  }

  return session.pressureModeEnabled
    ? applyPressurePageProgress(session, deltaPages, settings, nowMs, pageEvent)
    : applyCalmPageProgress(session, deltaPages, settings, nowMs, pageEvent)
}

export function observeReaderPage(
  session: ActiveSession,
  observation: ObservedReaderPage,
  settings: TimerSettings,
  nowMs = observation.observedAtMs,
): ActiveSession {
  if (session.status !== 'reading') {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const pageNumber = Math.trunc(observation.pageNumber)
  if (pageNumber <= 0) {
    return advanceSessionTimers(session, settings, nowMs)
  }

  if (session.observedPages.some((entry) => entry.pageNumber === pageNumber)) {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const normalizedObservation: ObservedReaderPage = {
    ...observation,
    pageNumber,
    observedAtMs: nowMs,
  }
  const pageEvent = {
    atMs: nowMs,
    deltaPages: 1,
    totalPages: session.totalPages + 1,
    source: 'auto' as const,
    readerPageNumber: pageNumber,
    readerVerseKey: normalizedObservation.verseKey,
  }

  return session.pressureModeEnabled
    ? applyPressurePageProgress(
        session,
        1,
        settings,
        nowMs,
        pageEvent,
        [...session.observedPages, normalizedObservation],
      )
    : applyCalmPageProgress(
        session,
        1,
        settings,
        nowMs,
        pageEvent,
        [...session.observedPages, normalizedObservation],
      )
}

export function undoLastPages(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.pageEvents.length === 0 || session.status === 'idle') {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const removedEvent = session.pageEvents[session.pageEvents.length - 1]
  const pageEvents = session.pageEvents.slice(0, -1)
  const totalPages = pageEvents.length === 0 ? 0 : pageEvents[pageEvents.length - 1].totalPages
  const lastPageLoggedAtMs = pageEvents.length === 0 ? null : pageEvents[pageEvents.length - 1].atMs
  const observedPages =
    removedEvent.source === 'auto' && removedEvent.readerPageNumber !== null
      ? session.observedPages.filter(
          (entry) => entry.pageNumber !== removedEvent.readerPageNumber,
        )
      : session.observedPages

  let activeBreak = session.activeBreak
  let breakLog = session.breakLog
  let status = session.status
  let scheduledPages = session.scheduledPages
  let paceWindowLog = session.paceWindowLog

  if (activeBreak && activeBreak.triggerPage === removedEvent.totalPages) {
    activeBreak = null
    breakLog = breakLog.slice(0, -1)
    paceWindowLog = paceWindowLog.slice(0, -1)
    scheduledPages = Math.max(0, removedEvent.totalPages - removedEvent.deltaPages)
    if (status === 'break') {
      status = 'reading'
    }
  }

  const updated = cloneWithUpdate(
    session,
    {
      totalPages,
      pageEvents,
      lastPageLoggedAtMs,
      activeBreak,
      breakLog,
      status,
      observedPages,
      scheduledPages,
      paceWindowLog,
    },
    nowMs,
  )

  return withDerivedMetrics(updated, settings, nowMs)
}

export function pauseSession(session: ActiveSession, nowMs = Date.now()): ActiveSession {
  if (session.status !== 'reading' && session.status !== 'break') {
    return cloneWithUpdate(session, {}, nowMs)
  }

  return cloneWithUpdate(
    session,
    {
      status: 'paused',
      hybridNudge: null,
    },
    nowMs,
  )
}

export function resumeSession(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status === 'break') {
    return completeBreak(session, settings, nowMs)
  }

  if (session.status !== 'paused') {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const pauseDurationMs = Math.max(0, nowMs - session.updatedAtMs)
  const shiftedActiveBreak = session.activeBreak
    ? {
        ...session.activeBreak,
        endsAtMs: session.activeBreak.endsAtMs + pauseDurationMs,
        snoozedUntilMs:
          session.activeBreak.snoozedUntilMs === null
            ? null
            : session.activeBreak.snoozedUntilMs + pauseDurationMs,
      }
    : null
  const shiftedPaceState = session.paceState
    ? {
        ...session.paceState,
        deadlineAtMs: session.paceState.deadlineAtMs + pauseDurationMs,
        catchUpEndsAtMs:
          session.paceState.catchUpEndsAtMs === null
            ? null
            : session.paceState.catchUpEndsAtMs + pauseDurationMs,
      }
    : null
  const nextStatus = shiftedActiveBreak ? 'break' : 'reading'

  return withDerivedMetrics(
    cloneWithUpdate(
      session,
      {
        status: nextStatus,
        activeBreak: shiftedActiveBreak,
        paceState: shiftedPaceState,
      },
      nowMs,
    ),
    settings,
    nowMs,
  )
}

export function snoozeReadingDeadline(
  session: ActiveSession,
  nowMs = Date.now(),
): ActiveSession {
  if (
    !session.pressureModeEnabled ||
    session.status !== 'reading' ||
    !session.paceState ||
    session.paceState.catchUpEndsAtMs !== null
  ) {
    return cloneWithUpdate(session, {}, nowMs)
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((session.paceState.deadlineAtMs - nowMs) / 1000),
  )
  if (remainingSeconds <= 0 || remainingSeconds > FINAL_TEN_WINDOW_SECONDS) {
    return cloneWithUpdate(session, {}, nowMs)
  }

  return cloneWithUpdate(
    session,
    {
      deadlineSnoozeCount: session.deadlineSnoozeCount + 1,
      paceState: {
        ...session.paceState,
        deadlineAtMs: session.paceState.deadlineAtMs + DEADLINE_SNOOZE_SECONDS * 1000,
        deadlineSnoozeCount: session.paceState.deadlineSnoozeCount + 1,
      },
    },
    nowMs,
  )
}

export function snoozeBreak(
  session: ActiveSession,
  seconds = 30,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status !== 'break' || !session.activeBreak) {
    return cloneWithUpdate(session, {}, nowMs)
  }

  const snoozeSeconds = Math.max(1, Math.trunc(seconds))
  const baseEndsAt = Math.max(session.activeBreak.endsAtMs, nowMs)
  const endsAtMs = baseEndsAt + snoozeSeconds * 1000

  const activeBreak: ActiveBreakState = {
    ...session.activeBreak,
    endsAtMs,
    snoozedUntilMs: endsAtMs,
  }
  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    snoozeCount: entry.snoozeCount + 1,
  }))

  return cloneWithUpdate(
    session,
    {
      activeBreak,
      breakLog,
      snoozeCount: session.snoozeCount + 1,
    },
    nowMs,
  )
}

export function skipBreak(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status !== 'break' || !session.activeBreak) {
    return advanceSessionTimers(session, settings, nowMs)
  }

  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    skipped: true,
    completedAtMs: nowMs,
  }))

  const nextPaceState =
    session.pressureModeEnabled && session.paceState === null
      ? createPaceState(
          session.scheduledPages,
          settings,
          nowMs,
          getLatePagesFromScheduled(session.scheduledPages, session.totalPages),
        )
      : session.paceState
  const updated = cloneWithUpdate(
    session,
    {
      status: 'reading',
      activeBreak: null,
      breakLog,
      skippedBreaks: session.skippedBreaks + 1,
      paceState: nextPaceState,
    },
    nowMs,
  )

  return withDerivedMetrics(updated, settings, nowMs)
}

export function advanceSessionTimers(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status === 'paused') {
    return session
  }

  if (session.status === 'break' && session.activeBreak) {
    if (nowMs >= session.activeBreak.endsAtMs) {
      return completeBreak(session, settings, nowMs)
    }

    return withDerivedMetrics(session, settings, nowMs)
  }

  if (!session.pressureModeEnabled) {
    return withDerivedMetrics(session, settings, nowMs)
  }

  if (!session.paceState) {
    return withDerivedMetrics(
      cloneWithUpdate(
        session,
        {
          paceState: createPaceState(
            session.scheduledPages,
            settings,
            nowMs,
            getLatePagesFromScheduled(session.scheduledPages, session.totalPages),
          ),
        },
        nowMs,
      ),
      settings,
      nowMs,
    )
  }

  if (session.paceState.catchUpEndsAtMs !== null) {
    if (nowMs >= session.paceState.catchUpEndsAtMs) {
      return resolveCatchUpWindow(session, settings, nowMs)
    }

    return withDerivedMetrics(session, settings, nowMs)
  }

  if (
    nowMs >= session.paceState.deadlineAtMs &&
    session.totalPages < session.paceState.targetEndPage
  ) {
    return beginCatchUpWindow(session, settings, nowMs)
  }

  return withDerivedMetrics(session, settings, nowMs)
}

export function advanceBreakTimer(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  return advanceSessionTimers(session, settings, nowMs)
}

export interface EndSessionResult {
  session: ActiveSession
  historyEntry: SessionHistoryEntry | null
}

export function endSession(session: ActiveSession, nowMs = Date.now()): EndSessionResult {
  if (session.status === 'idle') {
    return {
      session: cloneWithUpdate(session, { endedAtMs: nowMs }, nowMs),
      historyEntry: null,
    }
  }

  const settled = finalizeBreakIfStillOpen(session, nowMs)
  const finalizedPace = finalizeCurrentPaceWindow(session, nowMs)
  const finishedSession = cloneWithUpdate(
    session,
    {
      status: 'idle',
      endedAtMs: nowMs,
      activeBreak: null,
      breakLog: settled.breakLog,
      skippedBreaks: settled.skippedBreaks,
      hybridNudge: null,
      scheduledPages: finalizedPace.scheduledPages,
      currentPagesLate: finalizedPace.currentPagesLate,
      maxPagesLate: finalizedPace.maxPagesLate,
      onTimeWindows: finalizedPace.onTimeWindows,
      recoveredWindows: finalizedPace.recoveredWindows,
      currentOnTimeStreak: finalizedPace.currentOnTimeStreak,
      bestOnTimeStreak: finalizedPace.bestOnTimeStreak,
      paceWindowLog: finalizedPace.paceWindowLog,
      paceScore: finalizedPace.paceScore,
      paceState: null,
    },
    nowMs,
  )

  return {
    session: finishedSession,
    historyEntry: toHistoryEntry(finishedSession, nowMs),
  }
}
