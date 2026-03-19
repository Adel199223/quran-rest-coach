import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendExtensionMessage } from './chromeApi'
import type { ExtensionMessage } from './messages'

const TEST_MESSAGE: ExtensionMessage = {
  kind: 'session-command',
  command: { type: 'start-session' },
}

describe('sendExtensionMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a structured error when the extension context is invalidated mid-send', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          throw new Error('Extension context invalidated.')
        },
      },
    })

    await expect(sendExtensionMessage(TEST_MESSAGE)).resolves.toEqual({
      ok: false,
      error: 'Extension context invalidated.',
    })
  })

  it('returns the runtime lastError message instead of rejecting', async () => {
    const runtime = {
      lastError: { message: 'Receiving end does not exist.' },
      sendMessage: (
        _message: ExtensionMessage,
        callback?: (response?: { ok: boolean }) => void,
      ) => {
        callback?.()
      },
    }

    vi.stubGlobal('chrome', { runtime })

    await expect(sendExtensionMessage(TEST_MESSAGE)).resolves.toEqual({
      ok: false,
      error: 'Receiving end does not exist.',
    })
  })
})
