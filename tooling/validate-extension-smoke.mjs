import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const THIS_FILE = fileURLToPath(import.meta.url)
const TOOLING_DIR = path.dirname(THIS_FILE)
const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..')
const DEFAULT_EXTENSION_DIR = path.join(DEFAULT_ROOT_DIR, 'dist', 'extension')
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_ROOT_DIR, 'output', 'playwright')
const DEFAULT_QURAN_URL = 'https://quran.com/2'

function createArtifactPaths(outputDir) {
  return {
    quranScreenshot: path.join(outputDir, 'extension-smoke-quran-page.png'),
    sidepanelScreenshot: path.join(outputDir, 'extension-smoke-sidepanel.png'),
    failureQuranScreenshot: path.join(outputDir, 'extension-smoke-failure-quran.png'),
    failureSidepanelScreenshot: path.join(outputDir, 'extension-smoke-failure-sidepanel.png'),
    summary: path.join(outputDir, 'extension-smoke-summary.json'),
  }
}

function parseCliArgs(argv = process.argv.slice(2)) {
  let quranUrl = DEFAULT_QURAN_URL
  let outputDir = DEFAULT_OUTPUT_DIR
  let extensionDir = DEFAULT_EXTENSION_DIR

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--quran-url') {
      quranUrl = argv[index + 1] ?? DEFAULT_QURAN_URL
      index += 1
      continue
    }

    if (argument === '--output-dir') {
      outputDir = argv[index + 1] ?? outputDir
      index += 1
      continue
    }

    if (argument === '--extension-dir') {
      extensionDir = argv[index + 1] ?? extensionDir
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return { quranUrl, outputDir, extensionDir }
}

function buildSummary({ quranUrl, extensionId, steps, artifacts, error = null, startedAt, finishedAt }) {
  return {
    quranUrl,
    extensionId,
    startedAt,
    finishedAt,
    status: error ? 'failed' : 'passed',
    steps,
    artifacts,
    error,
  }
}

async function writeSummary(summaryPath, summary) {
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))
}

async function waitForExtensionId(context) {
  const existingWorker = context.serviceWorkers()[0]
  const worker = existingWorker ?? (await context.waitForEvent('serviceworker', { timeout: 15_000 }))
  const match = worker.url().match(/^chrome-extension:\/\/([^/]+)\//)

  if (!match) {
    throw new Error(`Unable to derive extension ID from service worker URL: ${worker.url()}`)
  }

  return match[1]
}

async function readActiveSessionTotalPages(sidepanelPage) {
  return sidepanelPage.evaluate(async () => {
    const activeSessionKey = 'qrc.activeSession.v2'
    const result = await chrome.storage.local.get(activeSessionKey)
    const rawValue = result[activeSessionKey]

    if (typeof rawValue !== 'string') {
      return null
    }

    const parsed = JSON.parse(rawValue)
    return Number.isInteger(parsed?.totalPages) ? parsed.totalPages : null
  })
}

async function readStoredReaderContext(sidepanelPage) {
  return sidepanelPage.evaluate(async () => {
    const readerContextKey = 'qrc.readerContext.v1'
    const result = await chrome.storage.local.get(readerContextKey)
    const rawValue = result[readerContextKey]

    if (typeof rawValue !== 'string') {
      return null
    }

    const parsed = JSON.parse(rawValue)
    return {
      pageNumber: Number.isInteger(parsed?.pageNumber) ? parsed.pageNumber : null,
      verseKey: typeof parsed?.verseKey === 'string' ? parsed.verseKey : null,
      chapterId: typeof parsed?.chapterId === 'string' ? parsed.chapterId : null,
      hizbNumber: Number.isInteger(parsed?.hizbNumber) ? parsed.hizbNumber : null,
    }
  })
}

async function waitForReaderContextMatch(sidepanelPage, expected) {
  await sidepanelPage.waitForFunction(
    async (expectedContext) => {
      const readerContextKey = 'qrc.readerContext.v1'
      const result = await chrome.storage.local.get(readerContextKey)
      const rawValue = result[readerContextKey]

      if (typeof rawValue !== 'string') {
        return false
      }

      const parsed = JSON.parse(rawValue)
      return (
        parsed?.pageNumber === expectedContext.pageNumber &&
        (parsed?.verseKey ?? null) === expectedContext.verseKey &&
        (parsed?.chapterId ?? null) === expectedContext.chapterId &&
        (parsed?.hizbNumber ?? null) === expectedContext.hizbNumber
      )
    },
    expected,
    { timeout: 20_000 },
  )
}

async function waitForAutoTrackedPages(sidepanelPage, minimumPages = 1) {
  await sidepanelPage.waitForFunction(
    async (minPages) => {
      const activeSessionKey = 'qrc.activeSession.v2'
      const result = await chrome.storage.local.get(activeSessionKey)
      const rawValue = result[activeSessionKey]

      if (typeof rawValue !== 'string') {
        return false
      }

      const parsed = JSON.parse(rawValue)
      return Number.isInteger(parsed?.totalPages) && parsed.totalPages >= minPages
    },
    minimumPages,
    { timeout: 20_000 },
  )
}

async function setSidePanelVisibility(sidepanelPage, open) {
  await sidepanelPage.evaluate(
    async (isOpen) => {
      await chrome.runtime.sendMessage({
        kind: 'session-command',
        command: { type: 'set-side-panel-visibility', open: isOpen },
      })
    },
    open,
  )
}

async function ensureCheckboxState(locator, expected) {
  if ((await locator.isChecked()) !== expected) {
    await locator.click()
  }
}

async function configurePressureMode(sidepanelPage) {
  await sidepanelPage.getByRole('button', { name: /settings/i }).click()
  await ensureCheckboxState(
    sidepanelPage.getByLabel(/show countdown while reading/i),
    true,
  )
  await ensureCheckboxState(
    sidepanelPage.getByLabel(/pressure timer while reading/i),
    true,
  )
  await ensureCheckboxState(
    sidepanelPage.getByLabel(/play a soft cue in the final 10 seconds/i),
    true,
  )
  await sidepanelPage
    .getByLabel(/start delay before reading/i)
    .fill('5')
  await sidepanelPage.getByRole('button', { name: /advanced timing/i }).click()
  const paceField = sidepanelPage.getByLabel('Default pace for 2 pages (seconds)')
  await paceField.fill('30')
  await sidepanelPage.getByRole('button', { name: /^session$/i }).click()
}

async function waitForCompanionSuppressed(quranPage) {
  await quranPage.waitForFunction(() => {
    return (
      document.querySelector('#qrc-content-root') !== null &&
      document.querySelector('#qrc-content-root .qrc-chip') === null &&
      document.querySelector('#qrc-content-root .qrc-toast') === null
    )
  }, { timeout: 20_000 })
}

async function readObservedPageNumbers(quranPage) {
  return quranPage.evaluate(() => {
    const matches = document.querySelectorAll('[data-page][data-verse-key], [data-page][data-chapter-id]')
    const pages = new Set()

    for (const match of matches) {
      const raw = match.getAttribute('data-page')
      const parsed = Number.parseInt(raw ?? '', 10)
      if (Number.isInteger(parsed) && parsed > 0) {
        pages.add(parsed)
      }
    }

    return [...pages].sort((left, right) => left - right)
  })
}

async function readPrimaryViewportMetadata(quranPage) {
  return quranPage.evaluate(() => {
    const selectors = ['[data-page][data-verse-key]', '[data-page][data-chapter-id]']
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const candidates = []

    for (const selector of selectors) {
      const matches = document.querySelectorAll(selector)
      for (const match of matches) {
        const rawPage = match.getAttribute('data-page')
        const pageNumber = Number.parseInt(rawPage ?? '', 10)
        if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
          continue
        }

        const rect = match.getBoundingClientRect()
        const intersectsViewport = rect.bottom > 0 && rect.top < viewportHeight
        const visibleHeight = intersectsViewport
          ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
          : 0
        const centerDistance = Math.abs(rect.top + rect.height / 2 - viewportHeight / 2)
        const rawHizb = match.getAttribute('data-hizb')
        const hizbNumber = Number.parseInt(rawHizb ?? '', 10)

        candidates.push({
          pageNumber,
          verseKey: match.getAttribute('data-verse-key'),
          chapterId: match.getAttribute('data-chapter-id'),
          hizbNumber: Number.isInteger(hizbNumber) && hizbNumber > 0 ? hizbNumber : null,
          intersectsViewport,
          visibleHeight,
          centerDistance,
        })
      }
    }

    if (candidates.length === 0) {
      return null
    }

    candidates.sort((left, right) => {
      if (left.intersectsViewport !== right.intersectsViewport) {
        return left.intersectsViewport ? -1 : 1
      }

      if (left.visibleHeight !== right.visibleHeight) {
        return right.visibleHeight - left.visibleHeight
      }

      if (left.centerDistance !== right.centerDistance) {
        return left.centerDistance - right.centerDistance
      }

      return right.pageNumber - left.pageNumber
    })

    const winner = candidates[0]
    return {
      pageNumber: winner.pageNumber,
      verseKey: winner.verseKey ?? null,
      chapterId: winner.chapterId ?? null,
      hizbNumber: winner.hizbNumber,
    }
  })
}

export async function runExtensionSmokeValidation(options = {}) {
  const quranUrl = options.quranUrl ?? DEFAULT_QURAN_URL
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR
  const extensionDir = options.extensionDir ?? DEFAULT_EXTENSION_DIR
  const artifacts = createArtifactPaths(outputDir)
  const steps = []
  const startedAt = new Date().toISOString()

  await fs.mkdir(outputDir, { recursive: true })
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qrc-extension-smoke-'))

  let context
  let sidepanelPage = null
  let quranPage = null
  let extensionId = null

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`,
      ],
    })

    extensionId = await waitForExtensionId(context)
    steps.push({
      name: 'extension-loaded',
      at: new Date().toISOString(),
      extensionId,
    })

    sidepanelPage = await context.newPage()
    await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
    await sidepanelPage.getByRole('heading', { name: 'Session', exact: true }).waitFor({
      timeout: 15_000,
    })
    steps.push({
      name: 'sidepanel-loaded',
      at: new Date().toISOString(),
    })

    await configurePressureMode(sidepanelPage)
    steps.push({
      name: 'pressure-mode-enabled',
      at: new Date().toISOString(),
    })

    quranPage = await context.newPage()
    await quranPage.goto(quranUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await quranPage.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

    steps.push({
      name: 'quran-page-opened',
      at: new Date().toISOString(),
      title: await quranPage.title(),
    })

    const metadataLocator = quranPage.locator('[data-page][data-verse-key], [data-page][data-chapter-id]')
    await metadataLocator.first().waitFor({ timeout: 20_000 })
    const metadataCount = await metadataLocator.count()
    steps.push({
      name: 'quran-metadata-count',
      at: new Date().toISOString(),
      metadataCount,
    })

    await quranPage.locator('#qrc-content-root').waitFor({ state: 'attached', timeout: 20_000 })
    await waitForCompanionSuppressed(quranPage)
    steps.push({
      name: 'content-companion-mounted',
      at: new Date().toISOString(),
    })
    steps.push({
      name: 'companion-suppressed-while-side-panel-open',
      at: new Date().toISOString(),
    })

    const initialViewportMetadata = await readPrimaryViewportMetadata(quranPage)
    if (!initialViewportMetadata) {
      throw new Error('Unable to read the primary Quran.com metadata in the viewport.')
    }

    await waitForReaderContextMatch(sidepanelPage, initialViewportMetadata)
    steps.push({
      name: 'reader-context-matches-initial-viewport',
      at: new Date().toISOString(),
      readerContext: await readStoredReaderContext(sidepanelPage),
    })

    const observedPages = await readObservedPageNumbers(quranPage)
    const nextViewportPage = observedPages.find(
      (pageNumber) => pageNumber > initialViewportMetadata.pageNumber,
    )

    if (nextViewportPage) {
      await quranPage.locator(`[data-page="${nextViewportPage}"]`).first().scrollIntoViewIfNeeded()
      await quranPage.waitForTimeout(1_000)
      const updatedViewportMetadata = await readPrimaryViewportMetadata(quranPage)

      if (!updatedViewportMetadata) {
        throw new Error('Unable to read the updated Quran.com metadata after scrolling.')
      }

      await waitForReaderContextMatch(sidepanelPage, updatedViewportMetadata)
      steps.push({
        name: 'reader-context-updates-while-scrolling',
        at: new Date().toISOString(),
        readerContext: await readStoredReaderContext(sidepanelPage),
      })
    }

    await sidepanelPage.getByRole('button', { name: /start session/i }).click()
    await sidepanelPage.getByRole('button', { name: /cancel/i }).waitFor({ timeout: 15_000 })
    await sidepanelPage.getByRole('button', { name: /cancel/i }).click()
    await sidepanelPage.getByRole('button', { name: /start session/i }).waitFor({ timeout: 15_000 })
    steps.push({
      name: 'pending-start-can-be-cancelled',
      at: new Date().toISOString(),
    })

    await sidepanelPage.getByRole('button', { name: /start session/i }).click()
    await sidepanelPage.getByRole('button', { name: /start now/i }).waitFor({ timeout: 15_000 })
    await sidepanelPage.getByRole('button', { name: /start now/i }).click()
    await sidepanelPage.getByRole('button', { name: /end session/i }).waitFor({ timeout: 15_000 })
    steps.push({
      name: 'session-started',
      at: new Date().toISOString(),
      totalPagesBeforeObservation: await readActiveSessionTotalPages(sidepanelPage),
    })

    await waitForAutoTrackedPages(sidepanelPage)
    const trackedPages = await readActiveSessionTotalPages(sidepanelPage)
    steps.push({
      name: 'auto-page-tracking-confirmed',
      at: new Date().toISOString(),
      trackedPages,
    })

    await sidepanelPage.locator('.metric-card-pressure-final-ten').first().waitFor({
      timeout: 25_000,
    })
    await sidepanelPage.getByText(/^timer$/i).waitFor({ timeout: 25_000 })
    await sidepanelPage.getByText(/\ds left|now/i).first().waitFor({ timeout: 25_000 })
    steps.push({
      name: 'sidepanel-pressure-phase-visible',
      at: new Date().toISOString(),
    })

    await waitForCompanionSuppressed(quranPage)
    steps.push({
      name: 'active-session-cues-suppressed-while-side-panel-open',
      at: new Date().toISOString(),
    })

    await sidepanelPage.screenshot({ path: artifacts.sidepanelScreenshot, fullPage: true })

    await sidepanelPage.getByRole('button', { name: /end session/i }).click()
    await sidepanelPage.getByRole('heading', { name: /session complete/i }).waitFor({
      timeout: 15_000,
    })
    await sidepanelPage.getByRole('button', { name: /view history/i }).click()
    await sidepanelPage.getByRole('heading', { name: /history/i }).waitFor({ timeout: 15_000 })
    await sidepanelPage.getByRole('button', { name: /^session$/i }).click()
    await sidepanelPage.getByRole('button', { name: /start session/i }).waitFor({ timeout: 15_000 })
    await sidepanelPage.getByRole('button', { name: /start session/i }).click()
    await sidepanelPage.getByRole('button', { name: /cancel/i }).waitFor({ timeout: 15_000 })
    await setSidePanelVisibility(sidepanelPage, false)
    await sidepanelPage.close()
    sidepanelPage = null
    await quranPage.waitForTimeout(3_000)

    sidepanelPage = await context.newPage()
    await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
    await sidepanelPage.getByRole('button', { name: /start session/i }).waitFor({ timeout: 15_000 })
    steps.push({
      name: 'closing-side-panel-cancels-pending-start',
      at: new Date().toISOString(),
    })

    await sidepanelPage.getByRole('button', { name: /start session/i }).click()
    await sidepanelPage.getByRole('button', { name: /start now/i }).waitFor({ timeout: 15_000 })
    await sidepanelPage.getByRole('button', { name: /start now/i }).click()
    await sidepanelPage.getByRole('button', { name: /end session/i }).waitFor({ timeout: 15_000 })
    await waitForAutoTrackedPages(sidepanelPage)
    await setSidePanelVisibility(sidepanelPage, false)
    await sidepanelPage.close()
    sidepanelPage = null
    await quranPage.locator('#qrc-content-root .qrc-chip').waitFor({ timeout: 20_000 })
    await quranPage.locator('#qrc-content-root .qrc-chip-phase-final-ten').waitFor({
      timeout: 30_000,
    })
    await quranPage
      .locator('#qrc-content-root .qrc-chip-subtitle')
      .filter({ hasText: /\ds left|now/i })
      .first()
      .waitFor({ timeout: 30_000 })
    steps.push({
      name: 'collapsed-chip-visible-when-side-panel-closed',
      at: new Date().toISOString(),
    })
    steps.push({
      name: 'collapsed-chip-mirrors-pressure-phase',
      at: new Date().toISOString(),
    })

    const currentViewportMetadata = await readPrimaryViewportMetadata(quranPage)
    const nextObservedPage = observedPages.find(
      (pageNumber) => pageNumber > (currentViewportMetadata?.pageNumber ?? observedPages[0] ?? 0),
    )

    if (nextObservedPage) {
      await quranPage.locator(`[data-page="${nextObservedPage}"]`).first().scrollIntoViewIfNeeded()
      await quranPage.locator('#qrc-content-root .qrc-toast').waitFor({ timeout: 20_000 })
      steps.push({
        name: 'break-prompt-visible-when-side-panel-closed',
        at: new Date().toISOString(),
        observedPage: nextObservedPage,
      })

      sidepanelPage = await context.newPage()
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      })
      await sidepanelPage.getByRole('dialog', { name: /micro break/i }).waitFor({
        timeout: 15_000,
      })
      await waitForCompanionSuppressed(quranPage)
      steps.push({
        name: 'break-prompt-suppressed-when-side-panel-reopened',
        at: new Date().toISOString(),
      })

      await sidepanelPage.getByRole('button', { name: /resume now/i }).click()
      await sidepanelPage.getByRole('dialog', { name: /micro break/i }).waitFor({
        state: 'detached',
        timeout: 15_000,
      })
      await sidepanelPage.getByRole('button', { name: /end session/i }).waitFor({ timeout: 15_000 })
      await waitForCompanionSuppressed(quranPage)
      steps.push({
        name: 'resume-returns-to-quiet-reading-state',
        at: new Date().toISOString(),
      })
    }

    await quranPage.screenshot({ path: artifacts.quranScreenshot, fullPage: true })

    const summary = buildSummary({
      quranUrl,
      extensionId,
      steps,
      artifacts: {
        quranScreenshot: path.basename(artifacts.quranScreenshot),
        sidepanelScreenshot: path.basename(artifacts.sidepanelScreenshot),
        summary: path.basename(artifacts.summary),
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    })

    await fs.rm(artifacts.failureQuranScreenshot, { force: true })
    await fs.rm(artifacts.failureSidepanelScreenshot, { force: true })
    await writeSummary(artifacts.summary, summary)
    return summary
  } catch (error) {
    if (quranPage) {
      await quranPage.screenshot({ path: artifacts.failureQuranScreenshot, fullPage: true }).catch(() => {})
    }

    if (sidepanelPage) {
      await sidepanelPage.screenshot({ path: artifacts.failureSidepanelScreenshot, fullPage: true }).catch(() => {})
    }

    const summary = buildSummary({
      quranUrl,
      extensionId,
      steps: [
        ...steps,
        {
          name: 'error',
          at: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      artifacts: {
        failureQuranScreenshot: path.basename(artifacts.failureQuranScreenshot),
        failureSidepanelScreenshot: path.basename(artifacts.failureSidepanelScreenshot),
        summary: path.basename(artifacts.summary),
      },
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: new Date().toISOString(),
    })

    await writeSummary(artifacts.summary, summary)
    throw error
  } finally {
    await context?.close().catch(() => {})
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function main() {
  const options = parseCliArgs()

  try {
    const summary = await runExtensionSmokeValidation(options)
    console.log(`Extension smoke validation passed for ${summary.quranUrl}.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] === THIS_FILE) {
  await main()
}
