import type { ExtensionCommandResult, ExtensionMessage } from './messages'

type MessageListener = (
  message: ExtensionMessage,
  sender: { tab?: { id?: number } },
) => Promise<ExtensionCommandResult | void> | ExtensionCommandResult | void

interface ChromeLike {
  runtime?: {
    getURL?: (path: string) => string
    sendMessage?: (
      message: ExtensionMessage,
      callback?: (response?: ExtensionCommandResult) => void,
    ) => void
    onMessage?: {
      addListener: (
        listener: (
          message: ExtensionMessage,
          sender: { tab?: { id?: number } },
          sendResponse: (response: ExtensionCommandResult) => void,
        ) => boolean | void,
      ) => void
      removeListener: (
        listener: (
          message: ExtensionMessage,
          sender: { tab?: { id?: number } },
          sendResponse: (response: ExtensionCommandResult) => void,
        ) => boolean | void,
      ) => void
    }
    onInstalled?: {
      addListener: (listener: () => void) => void
    }
    lastError?: {
      message?: string
    }
  }
  storage?: {
    local?: {
      get: (
        keys: string | string[] | Record<string, unknown>,
        callback: (items: Record<string, unknown>) => void,
      ) => void
      set: (items: Record<string, unknown>, callback?: () => void) => void
      remove: (keys: string | string[], callback?: () => void) => void
    }
    onChanged?: {
      addListener: (
        listener: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ) => void
      removeListener: (
        listener: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ) => void
    }
  }
  sidePanel?: {
    open?: (options: { tabId: number }) => Promise<void>
    setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>
  }
}

function getChromeLike(): ChromeLike | null {
  const candidate = globalThis as typeof globalThis & { chrome?: ChromeLike }
  return candidate.chrome ?? null
}

export function getChromeRuntime(): NonNullable<ChromeLike['runtime']> | null {
  return getChromeLike()?.runtime ?? null
}

export function getChromeStorage(): NonNullable<ChromeLike['storage']> | null {
  return getChromeLike()?.storage ?? null
}

export function getChromeSidePanel(): NonNullable<ChromeLike['sidePanel']> | null {
  return getChromeLike()?.sidePanel ?? null
}

export function getExtensionUrl(path: string): string {
  return getChromeRuntime()?.getURL?.(path) ?? path
}

export async function sendExtensionMessage(
  message: ExtensionMessage,
): Promise<ExtensionCommandResult> {
  const runtime = getChromeRuntime()
  if (!runtime?.sendMessage) {
    return { ok: false, error: 'Extension runtime is unavailable.' }
  }

  return new Promise((resolve) => {
    try {
      runtime.sendMessage?.(message, (response) => {
        const errorMessage = runtime.lastError?.message
        if (errorMessage) {
          resolve({ ok: false, error: errorMessage })
          return
        }

        resolve(response ?? { ok: true })
      })
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'Extension runtime is unavailable.',
      })
    }
  })
}

export function addRuntimeMessageListener(listener: MessageListener): () => void {
  const runtime = getChromeRuntime()
  if (!runtime?.onMessage) {
    return () => {}
  }

  const wrapped = (
    message: ExtensionMessage,
    sender: { tab?: { id?: number } },
    sendResponse: (response: ExtensionCommandResult) => void,
  ) => {
    Promise.resolve(listener(message, sender))
      .then((response) => {
        sendResponse(response ?? { ok: true })
      })
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unexpected extension error.',
        })
      })

    return true
  }

  runtime.onMessage.addListener(wrapped)
  return () => runtime.onMessage?.removeListener(wrapped)
}
