import type { ReaderContext } from '../domain'
import type { StorageAdapter } from '../lib/storage'
import {
  ACTIVE_SESSION_KEY,
  HISTORY_KEY,
  READER_CONTEXT_KEY,
  SETTINGS_KEY,
} from '../lib/storage'
import { getChromeStorage } from './chromeApi'

export class ChromeStorageAdapter implements StorageAdapter {
  public async getItem(key: string): Promise<string | null> {
    const storage = getChromeStorage()
    if (!storage?.local) {
      return null
    }

    return new Promise((resolve) => {
      storage.local?.get(key, (items) => {
        const raw = items[key]
        resolve(typeof raw === 'string' ? raw : null)
      })
    })
  }

  public async setItem(key: string, value: string): Promise<void> {
    const storage = getChromeStorage()
    if (!storage?.local) {
      return
    }

    await new Promise<void>((resolve) => {
      storage.local?.set({ [key]: value }, () => resolve())
    })
  }

  public async removeItem(key: string): Promise<void> {
    const storage = getChromeStorage()
    if (!storage?.local) {
      return
    }

    await new Promise<void>((resolve) => {
      storage.local?.remove(key, () => resolve())
    })
  }

  public subscribe(listener: (keys: string[]) => void): () => void {
    const storage = getChromeStorage()
    if (!storage?.onChanged) {
      return () => {}
    }

    const wrapped = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local') {
        return
      }

      const relevantKeys = Object.keys(changes).filter((key) =>
        [SETTINGS_KEY, ACTIVE_SESSION_KEY, HISTORY_KEY, READER_CONTEXT_KEY].includes(key),
      )
      if (relevantKeys.length > 0) {
        listener(relevantKeys)
      }
    }

    storage.onChanged.addListener(wrapped)
    return () => storage.onChanged?.removeListener(wrapped)
  }
}

export function createEmptyReaderContext(url: string, nowMs = Date.now()): ReaderContext {
  return {
    schemaVersion: 1,
    routeKind: 'unknown',
    locale: 'en',
    url,
    chapterId: null,
    verseKey: null,
    pageNumber: null,
    hizbNumber: null,
    automaticTrackingAvailable: false,
    updatedAtMs: nowMs,
  }
}
