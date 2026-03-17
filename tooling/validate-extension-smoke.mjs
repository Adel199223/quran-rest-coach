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

async function waitForAutoTrackedPages(sidepanelPage) {
  await sidepanelPage.waitForFunction(
    async () => {
      const activeSessionKey = 'qrc.activeSession.v2'
      const result = await chrome.storage.local.get(activeSessionKey)
      const rawValue = result[activeSessionKey]

      if (typeof rawValue !== 'string') {
        return false
      }

      const parsed = JSON.parse(rawValue)
      return Number.isInteger(parsed?.totalPages) && parsed.totalPages >= 1
    },
    { timeout: 20_000 },
  )
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

    await quranPage.locator('#qrc-content-root').waitFor({
      state: 'attached',
      timeout: 20_000,
    })
    await quranPage.locator('#qrc-content-root .qrc-chip').waitFor({ timeout: 20_000 })
    steps.push({
      name: 'content-companion-mounted',
      at: new Date().toISOString(),
    })

    await sidepanelPage.getByRole('button', { name: /start session/i }).click()
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

    await quranPage.screenshot({ path: artifacts.quranScreenshot, fullPage: true })
    await sidepanelPage.screenshot({ path: artifacts.sidepanelScreenshot, fullPage: true })

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
