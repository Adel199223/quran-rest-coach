import {
  type ActiveSession,
  type SessionHistoryEntry,
  type TimerSettings,
  isActiveSession,
  isSessionHistoryEntry,
  isTimerSettings,
} from '../domain/contracts'
import { normalizeTimerSettings } from '../domain/settings'

const SETTINGS_KEY = 'qrc.timerSettings.v1'
const ACTIVE_SESSION_KEY = 'qrc.activeSession.v1'
const HISTORY_KEY = 'qrc.sessionHistory.v1'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function resolveBrowserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage
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

export class LocalStorageRepository {
  private readonly storage: StorageAdapter | null

  public constructor(storage: StorageAdapter | null = resolveBrowserStorage()) {
    this.storage = storage
  }

  public getTimerSettings(): TimerSettings {
    const parsed = safeParseJson(this.storage?.getItem(SETTINGS_KEY) ?? null)
    if (isTimerSettings(parsed)) {
      return parsed
    }

    return normalizeTimerSettings(parsed)
  }

  public saveTimerSettings(settings: TimerSettings): void {
    this.storage?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  public getActiveSession(): ActiveSession | null {
    const parsed = safeParseJson(this.storage?.getItem(ACTIVE_SESSION_KEY) ?? null)
    return isActiveSession(parsed) ? parsed : null
  }

  public saveActiveSession(session: ActiveSession | null): void {
    if (!session) {
      this.storage?.removeItem(ACTIVE_SESSION_KEY)
      return
    }

    this.storage?.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
  }

  public getSessionHistory(): SessionHistoryEntry[] {
    const parsed = safeParseJson(this.storage?.getItem(HISTORY_KEY) ?? null)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is SessionHistoryEntry => isSessionHistoryEntry(item))
  }

  public saveSessionHistory(entries: SessionHistoryEntry[]): void {
    this.storage?.setItem(HISTORY_KEY, JSON.stringify(entries))
  }

  public appendSessionHistory(entry: SessionHistoryEntry): SessionHistoryEntry[] {
    const nextEntries = [...this.getSessionHistory(), entry]
    this.saveSessionHistory(nextEntries)
    return nextEntries
  }

  public resetHistory(): void {
    this.storage?.removeItem(HISTORY_KEY)
  }

  public resetSettings(): void {
    this.storage?.removeItem(SETTINGS_KEY)
  }
}

export function createLocalStorageRepository(
  storage?: StorageAdapter | null,
): LocalStorageRepository {
  return new LocalStorageRepository(storage ?? resolveBrowserStorage())
}
