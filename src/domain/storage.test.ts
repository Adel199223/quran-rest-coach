import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings } from './settings'
import { startSession, endSession } from './session'
import { LocalStorageRepository, type StorageAdapter } from '../lib/storage'

class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>()

  public async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null
  }

  public async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value)
  }

  public async removeItem(key: string): Promise<void> {
    this.map.delete(key)
  }
}

describe('local storage repository', () => {
  it('returns defaults when storage is empty', async () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = await repo.getTimerSettings()
    expect(settings.paceSecondsPerTwoPages).toBe(130)
    await expect(repo.getActiveSession()).resolves.toBeNull()
    await expect(repo.getSessionHistory()).resolves.toEqual([])
  })

  it('saves and loads settings', async () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = createDefaultTimerSettings(500)
    settings.paceSecondsPerTwoPages = 140
    await repo.saveTimerSettings(settings)

    const loaded = await repo.getTimerSettings()
    expect(loaded.paceSecondsPerTwoPages).toBe(140)
    expect(loaded.schemaVersion).toBe(1)
  })

  it('saves active session and appends history entries', async () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const session = startSession(0)
    await repo.saveActiveSession(session)
    expect((await repo.getActiveSession())?.sessionId).toBe(session.sessionId)

    const ended = endSession(session, 3000)
    if (!ended.historyEntry) {
      throw new Error('Expected history entry to be created')
    }
    const entries = await repo.appendSessionHistory(ended.historyEntry)
    expect(entries).toHaveLength(1)
    await expect(repo.getSessionHistory()).resolves.toHaveLength(1)
  })

  it('resets history and settings independently', async () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())
    const settings = createDefaultTimerSettings(100)
    await repo.saveTimerSettings(settings)
    await repo.saveSessionHistory([])
    await repo.resetHistory()
    await expect(repo.getSessionHistory()).resolves.toEqual([])

    await repo.resetSettings()
    const loaded = await repo.getTimerSettings()
    expect(loaded.paceSecondsPerTwoPages).toBe(130)
  })

  it('rejects invalid import payloads', async () => {
    const repo = new LocalStorageRepository(new MemoryStorageAdapter())

    await expect(repo.importData('{"invalid":true}')).rejects.toThrow(
      /invalid quran rest coach export file/i,
    )
  })
})
