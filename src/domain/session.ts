import {
  ACTIVE_SESSION_SCHEMA_VERSION,
  SESSION_HISTORY_SCHEMA_VERSION,
  type ActiveBreakState,
  type ActiveSession,
  type BreakLogEntry,
  type ObservedReaderPage,
  type SessionHistoryEntry,
  type TimerSettings,
} from './contracts'
import { computeHybridNudge, resolveBreakForPageCount } from './breakEngine'

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

function withHybridNudge(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (session.status !== 'reading') {
    return { ...session, hybridNudge: null }
  }

  return {
    ...session,
    hybridNudge: computeHybridNudge(session, settings, nowMs),
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

function applyPageProgress(
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
    return withHybridNudge(
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

  return cloneWithUpdate(
    session,
    {
      status: 'break',
      totalPages,
      pageEvents,
      lastPageLoggedAtMs: nowMs,
      activeBreak,
      breakLog: [...session.breakLog, breakLogEntry],
      hybridNudge: null,
      observedPages,
    },
    nowMs,
  )
}

export function createActiveSession(nowMs = Date.now()): ActiveSession {
  return {
    schemaVersion: ACTIVE_SESSION_SCHEMA_VERSION,
    sessionId: createSessionId(nowMs),
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
    skippedBreaks: 0,
    hybridNudge: null,
    observedPages: [],
  }
}

export function startSession(nowMs = Date.now()): ActiveSession {
  return createActiveSession(nowMs)
}

export function addPages(
  session: ActiveSession,
  pagesToAdd: number,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status !== 'reading') {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const deltaPages = Math.trunc(pagesToAdd)
  if (deltaPages <= 0) {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  return applyPageProgress(
    session,
    deltaPages,
    settings,
    nowMs,
    {
      atMs: nowMs,
      deltaPages,
      totalPages: session.totalPages + deltaPages,
      source: 'manual',
      readerPageNumber: null,
      readerVerseKey: null,
    },
  )
}

export function observeReaderPage(
  session: ActiveSession,
  observation: ObservedReaderPage,
  settings: TimerSettings,
  nowMs = observation.observedAtMs,
): ActiveSession {
  if (session.status !== 'reading') {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const pageNumber = Math.trunc(observation.pageNumber)
  if (pageNumber <= 0) {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  if (session.observedPages.some((entry) => entry.pageNumber === pageNumber)) {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const normalizedObservation: ObservedReaderPage = {
    ...observation,
    pageNumber,
    observedAtMs: nowMs,
  }

  return applyPageProgress(
    session,
    1,
    settings,
    nowMs,
    {
      atMs: nowMs,
      deltaPages: 1,
      totalPages: session.totalPages + 1,
      source: 'auto',
      readerPageNumber: pageNumber,
      readerVerseKey: normalizedObservation.verseKey,
    },
    [...session.observedPages, normalizedObservation],
  )
}

export function undoLastPages(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.pageEvents.length === 0 || session.status === 'idle') {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
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

  if (activeBreak && activeBreak.triggerPage === removedEvent.totalPages) {
    activeBreak = null
    breakLog = breakLog.slice(0, -1)
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
    },
    nowMs,
  )

  return withHybridNudge(updated, settings, nowMs)
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

function completeBreak(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs: number,
): ActiveSession {
  if (session.status !== 'break' || !session.activeBreak) {
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    completedAtMs: nowMs,
  }))

  return withHybridNudge(
    cloneWithUpdate(
      session,
      {
        status: 'reading',
        activeBreak: null,
        breakLog,
        breaksTaken: session.breaksTaken + 1,
      },
      nowMs,
    ),
    settings,
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
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const nextStatus = session.activeBreak ? 'break' : 'reading'
  const updated = cloneWithUpdate(
    session,
    {
      status: nextStatus,
    },
    nowMs,
  )

  return withHybridNudge(updated, settings, nowMs)
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
    return withHybridNudge(cloneWithUpdate(session, {}, nowMs), settings, nowMs)
  }

  const breakLog = updateLatestBreakLog(session.breakLog, (entry) => ({
    ...entry,
    skipped: true,
    completedAtMs: nowMs,
  }))

  const updated = cloneWithUpdate(
    session,
    {
      status: 'reading',
      activeBreak: null,
      breakLog,
      skippedBreaks: session.skippedBreaks + 1,
    },
    nowMs,
  )

  return withHybridNudge(updated, settings, nowMs)
}

export function advanceBreakTimer(
  session: ActiveSession,
  settings: TimerSettings,
  nowMs = Date.now(),
): ActiveSession {
  if (session.status !== 'break' || !session.activeBreak) {
    return session
  }

  if (nowMs < session.activeBreak.endsAtMs) {
    return session
  }

  return completeBreak(session, settings, nowMs)
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
    skipped: entry.skipped || true,
    completedAtMs: entry.completedAtMs ?? nowMs,
  }))

  return {
    breakLog,
    skippedBreaks: session.skippedBreaks + 1,
  }
}

function toHistoryEntry(session: ActiveSession, endedAtMs: number): SessionHistoryEntry {
  return {
    schemaVersion: SESSION_HISTORY_SCHEMA_VERSION,
    sessionId: session.sessionId,
    startedAtMs: session.startedAtMs,
    endedAtMs,
    totalPages: session.totalPages,
    breaksTaken: session.breaksTaken,
    snoozeCount: session.snoozeCount,
    skippedBreaks: session.skippedBreaks,
    breakLog: session.breakLog,
    observedPages: session.observedPages,
  }
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
  const finishedSession = cloneWithUpdate(
    session,
    {
      status: 'idle',
      endedAtMs: nowMs,
      activeBreak: null,
      breakLog: settled.breakLog,
      skippedBreaks: settled.skippedBreaks,
      hybridNudge: null,
    },
    nowMs,
  )

  return {
    session: finishedSession,
    historyEntry: toHistoryEntry(finishedSession, nowMs),
  }
}
