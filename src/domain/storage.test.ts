import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings } from './settings'
import { startSession, endSession } from './session'
import { LocalStorageRepository, type StorageAdapter } from '../lib/storage'

class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>()

  public getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  public setItem(key: string, value: string): void {
    this.map.set(key, value)
  }

  public removeItem(key: string): void {
    this.map.delete(key)
  }
}

describe('local storage repository', () => {
  it('returns defaults when storage is empty', () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = repo.getTimerSettings()
    expect(settings.paceSecondsPerTwoPages).toBe(130)
    expect(repo.getActiveSession()).toBeNull()
    expect(repo.getSessionHistory()).toEqual([])
  })

  it('saves and loads settings', () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = createDefaultTimerSettings(500)
    settings.paceSecondsPerTwoPages = 140
    repo.saveTimerSettings(settings)

    const loaded = repo.getTimerSettings()
    expect(loaded.paceSecondsPerTwoPages).toBe(140)
    expect(loaded.schemaVersion).toBe(1)
  })

  it('saves active session and appends history entries', () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const session = startSession(0)
    repo.saveActiveSession(session)
    expect(repo.getActiveSession()?.sessionId).toBe(session.sessionId)

    const ended = endSession(session, 3000)
    if (!ended.historyEntry) {
      throw new Error('Expected history entry to be created')
    }
    const entries = repo.appendSessionHistory(ended.historyEntry)
    expect(entries).toHaveLength(1)
    expect(repo.getSessionHistory()).toHaveLength(1)
  })

  it('resets history and settings independently', () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = createDefaultTimerSettings(100)
    repo.saveTimerSettings(settings)
    repo.saveSessionHistory([])
    repo.resetHistory()
    expect(repo.getSessionHistory()).toEqual([])

    repo.resetSettings()
    const loaded = repo.getTimerSettings()
    expect(loaded.paceSecondsPerTwoPages).toBe(130)
  })
})
