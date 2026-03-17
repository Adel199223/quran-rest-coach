import {
  ACTIVE_SESSION_SCHEMA_VERSION,
  COACH_EXPORT_SCHEMA_VERSION,
  READER_CONTEXT_SCHEMA_VERSION,
  SESSION_HISTORY_SCHEMA_VERSION,
  type ActiveBreakState,
  type ActiveSession,
  type BreakLogEntry,
  type CoachExportData,
  type ObservedReaderPage,
  type PageEvent,
  type ReaderContext,
  type SessionHistoryEntry,
  type TimerSettings,
  isBreakKind,
  isObjectLike,
  isReaderContext,
  isTimerSettings,
} from '../domain/contracts'
import { normalizeTimerSettings } from '../domain/settings'

const SETTINGS_KEY = 'qrc.timerSettings.v1'
const ACTIVE_SESSION_KEY = 'qrc.activeSession.v2'
const HISTORY_KEY = 'qrc.sessionHistory.v2'
const READER_CONTEXT_KEY = 'qrc.readerContext.v1'

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

function readFiniteOrNull(value: unknown): number | null {
  return value === null || Number.isFinite(value) ? (value as number | null) : null
}

function readStringOrNull(value: unknown): string | null {
  return value === null || typeof value === 'string' ? value : null
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
    startedAtMs: Number(value.startedAtMs),
    endedAtMs: Number(value.endedAtMs),
    totalPages: Math.max(0, readInt(value.totalPages, 0)),
    breaksTaken: Math.max(0, readInt(value.breaksTaken, 0)),
    snoozeCount: Math.max(0, readInt(value.snoozeCount, 0)),
    skippedBreaks: Math.max(0, readInt(value.skippedBreaks, 0)),
    breakLog,
    observedPages: normalizeObservedReaderPages(value.observedPages),
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

function normalizeExportDataInput(value: unknown): CoachExportData | null {
  if (!isObjectLike(value) || value.schemaVersion !== COACH_EXPORT_SCHEMA_VERSION) {
    return null
  }

  return {
    schemaVersion: COACH_EXPORT_SCHEMA_VERSION,
    exportedAtMs: Number.isFinite(value.exportedAtMs) ? Number(value.exportedAtMs) : Date.now(),
    settings: normalizeTimerSettings(value.settings),
    activeSession: normalizeActiveSessionInput(value.activeSession),
    historyEntries: normalizeHistoryEntries(value.historyEntries),
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
        listener([SETTINGS_KEY, ACTIVE_SESSION_KEY, HISTORY_KEY, READER_CONTEXT_KEY])
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
    const [settings, activeSession, historyEntries, readerContext] = await Promise.all([
      this.getTimerSettings(),
      this.getActiveSession(),
      this.getSessionHistory(),
      this.getReaderContext(),
    ])

    return {
      settings,
      activeSession,
      historyEntries,
      readerContext,
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

  public async resetHistory(): Promise<void> {
    await this.storage.removeItem(HISTORY_KEY)
  }

  public async resetSettings(): Promise<void> {
    await this.storage.removeItem(SETTINGS_KEY)
  }

  public async exportData(nowMs = Date.now()): Promise<CoachExportData> {
    const [settings, activeSession, historyEntries] = await Promise.all([
      this.getTimerSettings(),
      this.getActiveSession(),
      this.getSessionHistory(),
    ])

    return {
      schemaVersion: COACH_EXPORT_SCHEMA_VERSION,
      exportedAtMs: nowMs,
      settings,
      activeSession,
      historyEntries,
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
  normalizeActiveSessionInput,
  normalizeExportDataInput,
  normalizeHistoryEntries,
  normalizeReaderContextInput,
}
