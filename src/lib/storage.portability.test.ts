import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings } from '../domain/settings'
import { endSession, observeReaderPage, startSession } from '../domain/session'
import type { ObservedReaderPage } from '../domain/contracts'
import { LocalStorageRepository, type StorageAdapter } from './storage'

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

function createObservation(pageNumber: number, observedAtMs: number): ObservedReaderPage {
  return {
    pageNumber,
    observedAtMs,
    verseKey: `2:${pageNumber}`,
    chapterId: '2',
    hizbNumber: 1,
    source: 'quran-com-dom',
  }
}

describe('storage portability', () => {
  it('exports and imports settings, active sessions, and history entries as JSON', async () => {
    const settings = createDefaultTimerSettings(100)
    settings.paceSecondsPerTwoPages = 150

    const activeSession = observeReaderPage(
      startSession(0),
      createObservation(12, 1_000),
      settings,
      1_000,
    )

    const completedSession = observeReaderPage(
      startSession(2_000),
      createObservation(5, 3_000),
      settings,
      3_000,
    )
    const result = endSession(completedSession, 5_000)
    if (!result.historyEntry) {
      throw new Error('Expected a history entry for the completed session.')
    }

    const sourceRepository = new LocalStorageRepository(new MemoryStorageAdapter())
    await sourceRepository.saveTimerSettings(settings)
    await sourceRepository.saveActiveSession(activeSession)
    await sourceRepository.saveSessionHistory([result.historyEntry])

    const exported = await sourceRepository.exportData(6_000)
    expect(exported.exportedAtMs).toBe(6_000)
    expect(exported.activeSession?.observedPages[0]?.pageNumber).toBe(12)
    expect(exported.historyEntries[0]?.observedPages[0]?.pageNumber).toBe(5)

    const importedRepository = new LocalStorageRepository(new MemoryStorageAdapter())
    await importedRepository.importData(JSON.stringify(exported))

    const snapshot = await importedRepository.loadSnapshot()
    expect(snapshot.settings.paceSecondsPerTwoPages).toBe(150)
    expect(snapshot.activeSession?.observedPages.map((entry) => entry.pageNumber)).toEqual([12])
    expect(snapshot.historyEntries[0]?.observedPages.map((entry) => entry.pageNumber)).toEqual([5])
  })
})
