import {
  ACTIVE_SESSION_SCHEMA_VERSION,
  COACH_EXPORT_SCHEMA_VERSION,
  READER_CONTEXT_SCHEMA_VERSION,
  SESSION_HISTORY_SCHEMA_VERSION,
  STUDY_LATER_SCHEMA_VERSION,
  type ActiveBreakState,
  type ActiveSession,
  type BreakLogEntry,
  type CoachExportData,
  type ObservedReaderPage,
  type PageEvent,
  type PaceState,
  type PaceWindowLogEntry,
  type ReaderContext,
  type ReadingIntent,
  type SessionHistoryEntry,
  type StudyLaterItem,
  type TimerSettings,
  isBreakKind,
  isReadingIntent,
  isObjectLike,
  isReaderContext,
  isTimerSettings,
} from '../domain/contracts'
import { normalizeTimerSettings } from '../domain/settings'

const SETTINGS_KEY = 'qrc.timerSettings.v1'
const ACTIVE_SESSION_KEY = 'qrc.activeSession.v2'
const HISTORY_KEY = 'qrc.sessionHistory.v2'
const READER_CONTEXT_KEY = 'qrc.readerContext.v1'
const STUDY_LATER_KEY = 'qrc.studyLater.v1'

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  subscribe?(listener: (keys: string[]) => void): () => void
}

export interface CoachSnapshot {
  settings: TimerSettings
  activeSession: ActiveSession | null
  historyEntries: SessionHistoryEntry[]
  readerContext: ReaderContext | null
  studyLaterItems: StudyLaterItem[]
}

function resolveBrowserStorage():
  | {
      localStorage: Window['localStorage']
      addStorageListener: (listener: (event: StorageEvent) => void) => () => void
    }
  | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return {
    localStorage: window.localStorage,
    addStorageListener: (listener) => {
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    },
  }
}

function safeParseJson(input: string | null): unknown {
  if (!input) {
    return null
  }

  try {
    return JSON.parse(input) as unknown
  } catch {
    return null
  }
}

function readInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? Number(value) : fallback
}

function readPositiveInt(value: unknown, fallback: number): number {
  const parsed = readInt(value, fallback)
  return parsed > 0 ? parsed : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function readFiniteOrNull(value: unknown): number | null {
  return value === null || Number.isFinite(value) ? (value as number | null) : null
}

function readStringOrNull(value: unknown): string | null {
  return value === null || typeof value === 'string' ? value : null
}

function readReadingIntent(value: unknown, fallback: ReadingIntent = 'flow'): ReadingIntent {
  return isReadingIntent(value) ? value : fallback
}

function normalizeBreakLogEntry(value: unknown): BreakLogEntry | null {
  if (!isObjectLike(value) || !isBreakKind(value.kind)) {
    return null
  }

  const completedAtMs = readFiniteOrNull(value.completedAtMs)
  if (!Number.isFinite(value.triggeredAtMs)) {
    return null
  }

  return {
    kind: value.kind,
    triggerEveryPages: readPositiveInt(value.triggerEveryPages, 1),
    triggerPage: readPositiveInt(value.triggerPage, 1),
    durationSeconds: readPositiveInt(value.durationSeconds, 5),
    triggeredAtMs: Number(value.triggeredAtMs),
    completedAtMs,
    snoozeCount: Math.max(0, readInt(value.snoozeCount, 0)),
    skipped: typeof value.skipped === 'boolean' ? value.skipped : false,
  }
}

function normalizePageEvents(values: unknown): PageEvent[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalized: PageEvent[] = []
  let derivedTotalPages = 0

  for (const value of values) {
    if (!isObjectLike(value) || !Number.isFinite(value.atMs)) {
      continue
    }

    const deltaPages = readPositiveInt(value.deltaPages, 0)
    if (deltaPages <= 0) {
      continue
    }

    derivedTotalPages += deltaPages
    const candidateTotal = readInt(value.totalPages, derivedTotalPages)
    const totalPages = candidateTotal >= derivedTotalPages ? candidateTotal : derivedTotalPages
    derivedTotalPages = totalPages

    normalized.push({
      atMs: Number(value.atMs),
      deltaPages,
      totalPages,
      source: value.source === 'auto' ? 'auto' : 'manual',
      readerPageNumber:
        Number.isInteger(value.readerPageNumber) && Number(value.readerPageNumber) > 0
          ? Number(value.readerPageNumber)
          : null,
      readerVerseKey: typeof value.readerVerseKey === 'string' ? value.readerVerseKey : null,
    })
  }

  return normalized
}

function normalizeObservedReaderPages(values: unknown): ObservedReaderPage[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalized: ObservedReaderPage[] = []
  const seenPages = new Set<number>()

  for (const value of values) {
    if (!isObjectLike(value) || !Number.isFinite(value.observedAtMs)) {
      continue
    }

    const pageNumber = readPositiveInt(value.pageNumber, 0)
    if (pageNumber <= 0 || seenPages.has(pageNumber)) {
      continue
    }

    seenPages.add(pageNumber)
    normalized.push({
      pageNumber,
      verseKey: readStringOrNull(value.verseKey),
      chapterId: readStringOrNull(value.chapterId),
      hizbNumber:
        Number.isInteger(value.hizbNumber) && Number(value.hizbNumber) > 0
          ? Number(value.hizbNumber)
          : null,
      observedAtMs: Number(value.observedAtMs),
      source: value.source === 'quran-com-dom' ? value.source : 'quran-com-dom',
    })
  }

  return normalized
}

function normalizeActiveBreakState(value: unknown): ActiveBreakState | null {
  if (!isObjectLike(value) || !isBreakKind(value.kind)) {
    return null
  }

  if (!Number.isFinite(value.startedAtMs) || !Number.isFinite(value.endsAtMs)) {
    return null
  }

  return {
    kind: value.kind,
    triggerEveryPages: readPositiveInt(value.triggerEveryPages, 1),
    triggerPage: readPositiveInt(value.triggerPage, 1),
    durationSeconds: readPositiveInt(value.durationSeconds, 5),
    startedAtMs: Number(value.startedAtMs),
    endsAtMs: Number(value.endsAtMs),
    snoozedUntilMs: readFiniteOrNull(value.snoozedUntilMs),
  }
}

function normalizePaceState(value: unknown): PaceState | null {
  if (!isObjectLike(value) || !isBreakKind(value.breakKind)) {
    return null
  }

  if (!Number.isFinite(value.startedAtMs) || !Number.isFinite(value.deadlineAtMs)) {
    return null
  }

  return {
    targetStartPage: Math.max(0, readInt(value.targetStartPage, 0)),
    targetEndPage: readPositiveInt(value.targetEndPage, 1),
    targetPages: readPositiveInt(value.targetPages, 1),
    breakKind: value.breakKind,
    breakDurationSeconds: readPositiveInt(value.breakDurationSeconds, 5),
    startedAtMs: Number(value.startedAtMs),
    deadlineAtMs: Number(value.deadlineAtMs),
    originalDurationSeconds: readPositiveInt(value.originalDurationSeconds, 1),
    deadlineSnoozeCount: Math.max(0, readInt(value.deadlineSnoozeCount, 0)),
    latePagesAtWindowStart: Math.max(0, readInt(value.latePagesAtWindowStart, 0)),
    caughtUpAtMs: readFiniteOrNull(value.caughtUpAtMs),
    catchUpEndsAtMs: readFiniteOrNull(value.catchUpEndsAtMs),
  }
}

function normalizePaceWindowLog(values: unknown): PaceWindowLogEntry[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalized: PaceWindowLogEntry[] = []

  for (const value of values) {
    if (!isObjectLike(value) || !isBreakKind(value.breakKind)) {
      continue
    }

    if (
      !Number.isFinite(value.startedAtMs) ||
      !Number.isFinite(value.deadlineAtMs) ||
      !Number.isFinite(value.resolvedAtMs)
    ) {
      continue
    }

    normalized.push({
      mode: value.mode === 'catch-up-window' ? 'catch-up-window' : 'reading-window',
      targetStartPage: Math.max(0, readInt(value.targetStartPage, 0)),
      targetEndPage: readPositiveInt(value.targetEndPage, 1),
      targetPages: readPositiveInt(value.targetPages, 1),
      breakKind: value.breakKind,
      breakDurationSeconds: readPositiveInt(value.breakDurationSeconds, 5),
      startedAtMs: Number(value.startedAtMs),
      deadlineAtMs: Number(value.deadlineAtMs),
      resolvedAtMs: Number(value.resolvedAtMs),
      deadlineSnoozeCount: Math.max(0, readInt(value.deadlineSnoozeCount, 0)),
      missedDeadline: typeof value.missedDeadline === 'boolean' ? value.missedDeadline : false,
      caughtUpDuringCatchUp:
        typeof value.caughtUpDuringCatchUp === 'boolean'
          ? value.caughtUpDuringCatchUp
          : false,
      latePagesAtWindowStart: Math.max(0, readInt(value.latePagesAtWindowStart, 0)),
      latePagesAtWindowEnd: Math.max(0, readInt(value.latePagesAtWindowEnd, 0)),
      caughtUpAtMs: readFiniteOrNull(value.caughtUpAtMs),
      recoveredSecondsRemaining:
        value.recoveredSecondsRemaining === null ||
        (Number.isInteger(value.recoveredSecondsRemaining) &&
          Number(value.recoveredSecondsRemaining) >= 0)
          ? (value.recoveredSecondsRemaining as number | null)
          : null,
      score: clamp(readInt(value.score, 0), 0, 10),
    })
  }

  return normalized
}

function normalizeActiveSessionInput(value: unknown): ActiveSession | null {
  if (!isObjectLike(value) || typeof value.sessionId !== 'string') {
    return null
  }

  if (
    value.status !== 'idle' &&
    value.status !== 'reading' &&
    value.status !== 'break' &&
    value.status !== 'paused'
  ) {
    return null
  }

  if (!Number.isFinite(value.startedAtMs) || !Number.isFinite(value.updatedAtMs)) {
    return null
  }

  const pageEvents = normalizePageEvents(value.pageEvents)
  const observedPages = normalizeObservedReaderPages(value.observedPages)
  const breakLog = Array.isArray(value.breakLog)
    ? value.breakLog
        .map((entry) => normalizeBreakLogEntry(entry))
        .filter((entry): entry is BreakLogEntry => entry !== null)
    : []
  const activeBreak = normalizeActiveBreakState(value.activeBreak)
  const totalPages =
    Number.isInteger(value.totalPages) && Number(value.totalPages) >= 0
      ? Number(value.totalPages)
      : pageEvents.at(-1)?.totalPages ?? observedPages.length

  return {
    schemaVersion: ACTIVE_SESSION_SCHEMA_VERSION,
    sessionId: value.sessionId,
    readingIntent: readReadingIntent(value.readingIntent),
    pressureModeEnabled:
      typeof value.pressureModeEnabled === 'boolean' ? value.pressureModeEnabled : false,
    status: value.status === 'break' && !activeBreak ? 'reading' : value.status,
    startedAtMs: Number(value.startedAtMs),
    updatedAtMs: Number(value.updatedAtMs),
    endedAtMs: readFiniteOrNull(value.endedAtMs),
    totalPages,
    pageEvents,
    lastPageLoggedAtMs:
      readFiniteOrNull(value.lastPageLoggedAtMs) ?? pageEvents.at(-1)?.atMs ?? null,
    activeBreak,
    breakLog,
    breaksTaken: Math.max(0, readInt(value.breaksTaken, 0)),
    snoozeCount: Math.max(0, readInt(value.snoozeCount, 0)),
    deadlineSnoozeCount: Math.max(0, readInt(value.deadlineSnoozeCount, 0)),
    skippedBreaks: Math.max(0, readInt(value.skippedBreaks, 0)),
    hybridNudge:
      isObjectLike(value.hybridNudge) &&
      typeof value.hybridNudge.message === 'string' &&
      Number.isInteger(value.hybridNudge.overdueSeconds) &&
      Number.isInteger(value.hybridNudge.pagesUntilBreak)
        ? {
            message: value.hybridNudge.message,
            overdueSeconds: Math.max(0, Number(value.hybridNudge.overdueSeconds)),
            pagesUntilBreak: Math.max(1, Number(value.hybridNudge.pagesUntilBreak)),
          }
        : null,
    observedPages,
    scheduledPages: Math.max(0, readInt(value.scheduledPages, 0)),
    currentPagesLate: Math.max(0, readInt(value.currentPagesLate, 0)),
    maxPagesLate: Math.max(0, readInt(value.maxPagesLate, 0)),
    onTimeWindows: Math.max(0, readInt(value.onTimeWindows, 0)),
    recoveredWindows: Math.max(0, readInt(value.recoveredWindows, 0)),
    currentOnTimeStreak: Math.max(0, readInt(value.currentOnTimeStreak, 0)),
    bestOnTimeStreak: Math.max(0, readInt(value.bestOnTimeStreak, 0)),
    paceState: normalizePaceState(value.paceState),
    paceWindowLog: normalizePaceWindowLog(value.paceWindowLog),
    paceScore: clamp(readInt(value.paceScore, 100), 0, 100),
  }
}

function normalizeHistoryEntryInput(value: unknown): SessionHistoryEntry | null {
  if (!isObjectLike(value) || typeof value.sessionId !== 'string') {
    return null
  }

  if (!Number.isFinite(value.startedAtMs) || !Number.isFinite(value.endedAtMs)) {
    return null
  }

  const breakLog = Array.isArray(value.breakLog)
    ? value.breakLog
        .map((entry) => normalizeBreakLogEntry(entry))
        .filter((entry): entry is BreakLogEntry => entry !== null)
    : []

  return {
    schemaVersion: SESSION_HISTORY_SCHEMA_VERSION,
    sessionId: value.sessionId,
    readingIntent: readReadingIntent(value.readingIntent),
    pressureModeEnabled:
      typeof value.pressureModeEnabled === 'boolean' ? value.pressureModeEnabled : false,
    startedAtMs: Number(value.startedAtMs),
    endedAtMs: Number(value.endedAtMs),
    totalPages: Math.max(0, readInt(value.totalPages, 0)),
    breaksTaken: Math.max(0, readInt(value.breaksTaken, 0)),
    snoozeCount: Math.max(0, readInt(value.snoozeCount, 0)),
    deadlineSnoozeCount: Math.max(0, readInt(value.deadlineSnoozeCount, 0)),
    skippedBreaks: Math.max(0, readInt(value.skippedBreaks, 0)),
    breakLog,
    observedPages: normalizeObservedReaderPages(value.observedPages),
    maxPagesLate: Math.max(0, readInt(value.maxPagesLate, 0)),
    endingLatePages: Math.max(0, readInt(value.endingLatePages, 0)),
    missedBreakWindows: Math.max(0, readInt(value.missedBreakWindows, 0)),
    onTimeWindows: Math.max(0, readInt(value.onTimeWindows, 0)),
    recoveredWindows: Math.max(0, readInt(value.recoveredWindows, 0)),
    currentOnTimeStreak: Math.max(0, readInt(value.currentOnTimeStreak, 0)),
    bestOnTimeStreak: Math.max(0, readInt(value.bestOnTimeStreak, 0)),
    paceWindowLog: normalizePaceWindowLog(value.paceWindowLog),
    paceScore: clamp(readInt(value.paceScore, 100), 0, 100),
  }
}

function normalizeHistoryEntries(values: unknown): SessionHistoryEntry[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((value) => normalizeHistoryEntryInput(value))
    .filter((value): value is SessionHistoryEntry => value !== null)
}

function normalizeReaderContextInput(value: unknown): ReaderContext | null {
  if (isReaderContext(value)) {
    return value
  }

  if (!isObjectLike(value) || typeof value.url !== 'string') {
    return null
  }

  return {
    schemaVersion: READER_CONTEXT_SCHEMA_VERSION,
    routeKind:
      value.routeKind === 'surah' ||
      value.routeKind === 'verse' ||
      value.routeKind === 'page' ||
      value.routeKind === 'juz' ||
      value.routeKind === 'hizb' ||
      value.routeKind === 'rub'
        ? value.routeKind
        : 'unknown',
    locale: typeof value.locale === 'string' ? value.locale : 'en',
    url: value.url,
    chapterId: readStringOrNull(value.chapterId),
    verseKey: readStringOrNull(value.verseKey),
    pageNumber:
      Number.isInteger(value.pageNumber) && Number(value.pageNumber) > 0
        ? Number(value.pageNumber)
        : null,
    hizbNumber:
      Number.isInteger(value.hizbNumber) && Number(value.hizbNumber) > 0
        ? Number(value.hizbNumber)
        : null,
    automaticTrackingAvailable:
      typeof value.automaticTrackingAvailable === 'boolean'
        ? value.automaticTrackingAvailable
        : false,
    updatedAtMs: Number.isFinite(value.updatedAtMs) ? Number(value.updatedAtMs) : Date.now(),
  }
}

function normalizeStudyLaterItemInput(value: unknown): StudyLaterItem | null {
  if (!isObjectLike(value) || typeof value.id !== 'string' || typeof value.url !== 'string') {
    return null
  }

  return {
    schemaVersion: STUDY_LATER_SCHEMA_VERSION,
    id: value.id,
    savedAtMs: Number.isFinite(value.savedAtMs) ? Number(value.savedAtMs) : Date.now(),
    sessionId: readStringOrNull(value.sessionId),
    readingIntent: value.readingIntent === null ? null : readReadingIntent(value.readingIntent),
    routeKind:
      value.routeKind === 'surah' ||
      value.routeKind === 'verse' ||
      value.routeKind === 'page' ||
      value.routeKind === 'juz' ||
      value.routeKind === 'hizb' ||
      value.routeKind === 'rub'
        ? value.routeKind
        : 'unknown',
    url: value.url,
    chapterId: readStringOrNull(value.chapterId),
    verseKey: readStringOrNull(value.verseKey),
    pageNumber:
      Number.isInteger(value.pageNumber) && Number(value.pageNumber) > 0
        ? Number(value.pageNumber)
        : null,
    hizbNumber:
      Number.isInteger(value.hizbNumber) && Number(value.hizbNumber) > 0
        ? Number(value.hizbNumber)
        : null,
  }
}

function normalizeStudyLaterItems(values: unknown): StudyLaterItem[] {
  if (!Array.isArray(values)) {
    return []
  }

  const seenIds = new Set<string>()
  const normalized: StudyLaterItem[] = []

  for (const value of values) {
    const item = normalizeStudyLaterItemInput(value)
    if (!item || seenIds.has(item.id)) {
      continue
    }

    seenIds.add(item.id)
    normalized.push(item)
  }

  return normalized.sort((left, right) => right.savedAtMs - left.savedAtMs)
}

function normalizeExportDataInput(value: unknown): CoachExportData | null {
  if (
    !isObjectLike(value) ||
    ![1, 2, 3, 4, COACH_EXPORT_SCHEMA_VERSION].includes(Number(value.schemaVersion))
  ) {
    return null
  }

  return {
    schemaVersion: COACH_EXPORT_SCHEMA_VERSION,
    exportedAtMs: Number.isFinite(value.exportedAtMs) ? Number(value.exportedAtMs) : Date.now(),
    settings: normalizeTimerSettings(value.settings),
    activeSession: normalizeActiveSessionInput(value.activeSession),
    historyEntries: normalizeHistoryEntries(value.historyEntries),
    studyLaterItems: normalizeStudyLaterItems(value.studyLaterItems),
  }
}

export class BrowserStorageAdapter implements StorageAdapter {
  private readonly browserStorage = resolveBrowserStorage()

  public async getItem(key: string): Promise<string | null> {
    return this.browserStorage?.localStorage.getItem(key) ?? null
  }

  public async setItem(key: string, value: string): Promise<void> {
    this.browserStorage?.localStorage.setItem(key, value)
  }

  public async removeItem(key: string): Promise<void> {
    this.browserStorage?.localStorage.removeItem(key)
  }

  public subscribe(listener: (keys: string[]) => void): () => void {
    if (!this.browserStorage) {
      return () => {}
    }

    return this.browserStorage.addStorageListener((event) => {
      if (!event.key) {
        listener([
          SETTINGS_KEY,
          ACTIVE_SESSION_KEY,
          HISTORY_KEY,
          READER_CONTEXT_KEY,
          STUDY_LATER_KEY,
        ])
        return
      }

      listener([event.key])
    })
  }
}

export class LocalStorageRepository {
  private readonly storage: StorageAdapter

  public constructor(storage: StorageAdapter = new BrowserStorageAdapter()) {
    this.storage = storage
  }

  public async loadSnapshot(): Promise<CoachSnapshot> {
    const [settings, activeSession, historyEntries, readerContext, studyLaterItems] =
      await Promise.all([
      this.getTimerSettings(),
      this.getActiveSession(),
      this.getSessionHistory(),
      this.getReaderContext(),
      this.getStudyLaterItems(),
    ])

    return {
      settings,
      activeSession,
      historyEntries,
      readerContext,
      studyLaterItems,
    }
  }

  public subscribe(listener: (keys: string[]) => void): () => void {
    return this.storage.subscribe?.(listener) ?? (() => {})
  }

  public async getTimerSettings(): Promise<TimerSettings> {
    const parsed = safeParseJson(await this.storage.getItem(SETTINGS_KEY))
    if (isTimerSettings(parsed)) {
      return parsed
    }

    return normalizeTimerSettings(parsed)
  }

  public async saveTimerSettings(settings: TimerSettings): Promise<void> {
    await this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  public async getActiveSession(): Promise<ActiveSession | null> {
    const current = normalizeActiveSessionInput(
      safeParseJson(await this.storage.getItem(ACTIVE_SESSION_KEY)),
    )
    if (current) {
      return current
    }

    const legacy = normalizeActiveSessionInput(
      safeParseJson(await this.storage.getItem('qrc.activeSession.v1')),
    )
    if (legacy) {
      await this.saveActiveSession(legacy)
      await this.storage.removeItem('qrc.activeSession.v1')
    }

    return legacy
  }

  public async saveActiveSession(session: ActiveSession | null): Promise<void> {
    if (!session) {
      await this.storage.removeItem(ACTIVE_SESSION_KEY)
      return
    }

    await this.storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
  }

  public async getSessionHistory(): Promise<SessionHistoryEntry[]> {
    const current = normalizeHistoryEntries(
      safeParseJson(await this.storage.getItem(HISTORY_KEY)),
    )
    if (current.length > 0) {
      return current
    }

    const legacy = normalizeHistoryEntries(
      safeParseJson(await this.storage.getItem('qrc.sessionHistory.v1')),
    )
    if (legacy.length > 0) {
      await this.saveSessionHistory(legacy)
      await this.storage.removeItem('qrc.sessionHistory.v1')
      return legacy
    }

    return current
  }

  public async saveSessionHistory(entries: SessionHistoryEntry[]): Promise<void> {
    await this.storage.setItem(HISTORY_KEY, JSON.stringify(entries))
  }

  public async appendSessionHistory(
    entry: SessionHistoryEntry,
  ): Promise<SessionHistoryEntry[]> {
    const nextEntries = [...(await this.getSessionHistory()), entry]
    await this.saveSessionHistory(nextEntries)
    return nextEntries
  }

  public async getReaderContext(): Promise<ReaderContext | null> {
    return normalizeReaderContextInput(
      safeParseJson(await this.storage.getItem(READER_CONTEXT_KEY)),
    )
  }

  public async saveReaderContext(context: ReaderContext | null): Promise<void> {
    if (!context) {
      await this.storage.removeItem(READER_CONTEXT_KEY)
      return
    }

    await this.storage.setItem(READER_CONTEXT_KEY, JSON.stringify(context))
  }

  public async getStudyLaterItems(): Promise<StudyLaterItem[]> {
    return normalizeStudyLaterItems(
      safeParseJson(await this.storage.getItem(STUDY_LATER_KEY)),
    )
  }

  public async saveStudyLaterItems(items: StudyLaterItem[]): Promise<void> {
    await this.storage.setItem(STUDY_LATER_KEY, JSON.stringify(items))
  }

  public async appendStudyLaterItem(item: StudyLaterItem): Promise<StudyLaterItem[]> {
    const existing = await this.getStudyLaterItems()
    const deduped = existing.filter((entry) => entry.id !== item.id)
    const nextItems = [item, ...deduped]
    await this.saveStudyLaterItems(nextItems)
    return nextItems
  }

  public async removeStudyLaterItem(itemId: string): Promise<StudyLaterItem[]> {
    const nextItems = (await this.getStudyLaterItems()).filter((entry) => entry.id !== itemId)
    await this.saveStudyLaterItems(nextItems)
    return nextItems
  }

  public async resetHistory(): Promise<void> {
    await this.storage.removeItem(HISTORY_KEY)
  }

  public async resetStudyLater(): Promise<void> {
    await this.storage.removeItem(STUDY_LATER_KEY)
  }

  public async resetSettings(): Promise<void> {
    await this.storage.removeItem(SETTINGS_KEY)
  }

  public async exportData(nowMs = Date.now()): Promise<CoachExportData> {
    const [settings, activeSession, historyEntries, studyLaterItems] = await Promise.all([
      this.getTimerSettings(),
      this.getActiveSession(),
      this.getSessionHistory(),
      this.getStudyLaterItems(),
    ])

    return {
      schemaVersion: COACH_EXPORT_SCHEMA_VERSION,
      exportedAtMs: nowMs,
      settings,
      activeSession,
      historyEntries,
      studyLaterItems,
    }
  }

  public async importData(payload: string | CoachExportData): Promise<CoachExportData> {
    const parsed =
      typeof payload === 'string' ? normalizeExportDataInput(safeParseJson(payload)) : payload

    if (!parsed) {
      throw new Error('Invalid Quran Rest Coach export file.')
    }

    await Promise.all([
      this.saveTimerSettings(parsed.settings),
      this.saveActiveSession(parsed.activeSession),
      this.saveSessionHistory(parsed.historyEntries),
      this.saveStudyLaterItems(parsed.studyLaterItems),
    ])

    return parsed
  }
}

export function createLocalStorageRepository(
  storage?: StorageAdapter,
): LocalStorageRepository {
  return new LocalStorageRepository(storage ?? new BrowserStorageAdapter())
}

export {
  ACTIVE_SESSION_KEY,
  HISTORY_KEY,
  READER_CONTEXT_KEY,
  SETTINGS_KEY,
  STUDY_LATER_KEY,
  normalizeActiveSessionInput,
  normalizeExportDataInput,
  normalizeHistoryEntries,
  normalizeReaderContextInput,
  normalizeStudyLaterItems,
}
