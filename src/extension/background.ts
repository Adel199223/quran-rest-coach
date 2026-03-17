import {
  addPages,
  endSession,
  observeReaderPage,
  pauseSession,
  resumeSession,
  skipBreak,
  snoozeBreak,
  startSession,
  undoLastPages,
} from '../domain'
import { buildResetSettings } from '../app/view-model'
import { LocalStorageRepository } from '../lib/storage'
import { addRuntimeMessageListener, getChromeRuntime, getChromeSidePanel } from './chromeApi'
import { ChromeStorageAdapter } from './chromeStorage'
import type { ExtensionMessage } from './messages'

const repository = new LocalStorageRepository(new ChromeStorageAdapter())

async function openSidePanelForSender(sender: { tab?: { id?: number } }) {
  const tabId = sender.tab?.id
  const sidePanel = getChromeSidePanel()

  if (!tabId || !sidePanel?.open) {
    return {
      ok: false,
      error: 'Unable to open the Quran Rest Coach side panel for this tab.',
    }
  }

  await sidePanel.open({ tabId })
  return { ok: true }
}

async function handleSessionCommand(
  message: Extract<ExtensionMessage, { kind: 'session-command' }>,
  sender: { tab?: { id?: number } },
) {
  const { command } = message
  const nowMs = Date.now()

  if (command.type === 'open-side-panel') {
    return openSidePanelForSender(sender)
  }

  if (command.type === 'export-data') {
    return {
      ok: true,
      exportData: await repository.exportData(nowMs),
    }
  }

  if (command.type === 'import-data') {
    await repository.importData(command.payload)
    return { ok: true }
  }

  const [settings, activeSession] = await Promise.all([
    repository.getTimerSettings(),
    repository.getActiveSession(),
  ])

  switch (command.type) {
    case 'start-session':
      await repository.saveActiveSession(startSession(nowMs))
      return { ok: true }
    case 'add-pages':
      if (!activeSession) {
        return { ok: false, error: 'Start a session before logging pages.' }
      }
      await repository.saveActiveSession(addPages(activeSession, command.pages, settings, nowMs))
      return { ok: true }
    case 'undo-last-pages':
      if (!activeSession) {
        return { ok: false, error: 'No session is active.' }
      }
      await repository.saveActiveSession(undoLastPages(activeSession, settings, nowMs))
      return { ok: true }
    case 'toggle-pause':
      if (!activeSession) {
        return { ok: false, error: 'No session is active.' }
      }
      await repository.saveActiveSession(
        activeSession.status === 'paused'
          ? resumeSession(activeSession, settings, nowMs)
          : pauseSession(activeSession, nowMs),
      )
      return { ok: true }
    case 'resume-break':
      if (!activeSession) {
        return { ok: false, error: 'No break is active.' }
      }
      await repository.saveActiveSession(resumeSession(activeSession, settings, nowMs))
      return { ok: true }
    case 'snooze-break':
      if (!activeSession) {
        return { ok: false, error: 'No break is active.' }
      }
      await repository.saveActiveSession(
        snoozeBreak(activeSession, command.seconds, nowMs),
      )
      return { ok: true }
    case 'skip-break':
      if (!activeSession) {
        return { ok: false, error: 'No break is active.' }
      }
      await repository.saveActiveSession(skipBreak(activeSession, settings, nowMs))
      return { ok: true }
    case 'end-session':
      if (!activeSession) {
        return { ok: false, error: 'No session is active.' }
      }
      {
        const result = endSession(activeSession, nowMs)
        await repository.saveActiveSession(null)
        if (result.historyEntry) {
          await repository.appendSessionHistory(result.historyEntry)
        }
      }
      return { ok: true }
    case 'update-settings':
      await repository.saveTimerSettings(command.settings)
      return { ok: true }
    case 'reset-settings':
      await repository.saveTimerSettings(buildResetSettings(nowMs))
      return { ok: true }
    case 'reset-history':
      await repository.resetHistory()
      return { ok: true }
    case 'discard-active-session':
      await repository.saveActiveSession(null)
      return { ok: true }
    default:
      return { ok: false, error: 'Unsupported session command.' }
  }
}

async function handleObservedPage(
  message: Extract<ExtensionMessage, { kind: 'reader-page:observed' }>,
) {
  const [settings, activeSession] = await Promise.all([
    repository.getTimerSettings(),
    repository.getActiveSession(),
  ])

  if (!activeSession) {
    return { ok: true }
  }

  const updated = observeReaderPage(
    activeSession,
    message.observation,
    settings,
    message.observation.observedAtMs,
  )
  await repository.saveActiveSession(updated)
  return { ok: true }
}

void getChromeSidePanel()?.setPanelBehavior?.({
  openPanelOnActionClick: true,
})

const runtime = getChromeRuntime()
runtime?.onInstalled?.addListener(() => {
  void getChromeSidePanel()?.setPanelBehavior?.({
    openPanelOnActionClick: true,
  })
})

addRuntimeMessageListener(async (message, sender) => {
  switch (message.kind) {
    case 'reader-context:update':
      await repository.saveReaderContext(message.context)
      return { ok: true }
    case 'reader-page:observed':
      return handleObservedPage(message)
    case 'session-command':
      return handleSessionCommand(message, sender)
    default:
      return { ok: false, error: 'Unknown extension message.' }
  }
})
