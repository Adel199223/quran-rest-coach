import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { runExtensionSmokeValidation } from './validate-extension-smoke.mjs'

const THIS_FILE = fileURLToPath(import.meta.url)
const TOOLING_DIR = path.dirname(THIS_FILE)
const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..')
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_ROOT_DIR, 'output', 'playwright')
const SUMMARY_PATH = path.join(DEFAULT_OUTPUT_DIR, 'extension-validation-summary.json')

const VALIDATION_SCENARIOS = [
  { id: 'quran-2', quranUrl: 'https://quran.com/2' },
  { id: 'quran-3', quranUrl: 'https://quran.com/3' },
]

async function main() {
  const startedAt = new Date().toISOString()
  const results = []

  await fs.mkdir(DEFAULT_OUTPUT_DIR, { recursive: true })

  for (const scenario of VALIDATION_SCENARIOS) {
    const outputDir = path.join(DEFAULT_OUTPUT_DIR, scenario.id)
    const summary = await runExtensionSmokeValidation({
      quranUrl: scenario.quranUrl,
      outputDir,
    })

    results.push({
      id: scenario.id,
      quranUrl: scenario.quranUrl,
      status: summary.status,
      outputDir: path.relative(DEFAULT_ROOT_DIR, outputDir),
      summary: path.relative(DEFAULT_ROOT_DIR, path.join(outputDir, 'extension-smoke-summary.json')),
    })
  }

  await fs.writeFile(
    SUMMARY_PATH,
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
        results,
      },
      null,
      2,
    ),
  )

  console.log(`Extension validation passed for ${VALIDATION_SCENARIOS.length} Quran.com routes.`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
