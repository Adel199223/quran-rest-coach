import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { REQUIRED_FILES, validateAgentDocs } from '../../tooling/validate-agent-docs.mjs'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const tempRoots: string[] = []

async function createAgentDocsFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'qrc-agent-docs-'))
  tempRoots.push(rootDir)

  for (const relativePath of REQUIRED_FILES) {
    const sourcePath = path.join(PROJECT_ROOT, relativePath)
    const targetPath = path.join(rootDir, relativePath)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await copyFile(sourcePath, targetPath)
  }

  return rootDir
}

async function overwriteFile(rootDir: string, relativePath: string, transform: (content: string) => string) {
  const absolutePath = path.join(rootDir, relativePath)
  const nextContent = transform(await readFile(absolutePath, 'utf8'))
  await writeFile(absolutePath, nextContent)
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((rootDir) => rm(rootDir, { force: true, recursive: true })),
  )
})

describe('validateAgentDocs', () => {
  it('passes for the project root', () => {
    expect(validateAgentDocs({ rootDir: PROJECT_ROOT })).toEqual([])
  })

  it('fails when a required workflow file is missing', async () => {
    const rootDir = await createAgentDocsFixture()
    await rm(path.join(rootDir, 'docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md'))

    expect(validateAgentDocs({ rootDir })).toContain(
      'Missing required file: docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md',
    )
  })

  it('fails when a required workflow id is missing from the manifest', async () => {
    const rootDir = await createAgentDocsFixture()
    const manifestPath = path.join(rootDir, 'docs/assistant/manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.workflows = manifest.workflows.filter(
      (workflow: { id: string }) => workflow.id !== 'reference_discovery',
    )
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

    expect(validateAgentDocs({ rootDir })).toContain(
      'Manifest is missing required workflow id: reference_discovery',
    )
  })

  it('fails when a manifest path is broken', async () => {
    const rootDir = await createAgentDocsFixture()
    const manifestPath = path.join(rootDir, 'docs/assistant/manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.user_guides.app = 'docs/assistant/features/MISSING_GUIDE.md'
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

    expect(validateAgentDocs({ rootDir })).toContain(
      'Manifest path does not exist: docs/assistant/features/MISSING_GUIDE.md',
    )
  })

  it('fails when a workflow heading is missing', async () => {
    const rootDir = await createAgentDocsFixture()
    await overwriteFile(rootDir, 'docs/assistant/workflows/READING_SESSION_WORKFLOW.md', (content) =>
      content.replace('## Expected Outputs', '## Outputs'),
    )

    expect(validateAgentDocs({ rootDir })).toContain(
      'docs/assistant/workflows/READING_SESSION_WORKFLOW.md is missing workflow heading: ## Expected Outputs',
    )
  })

  it('fails when sub-agent routing guidance is missing from the shim runbook', async () => {
    const rootDir = await createAgentDocsFixture()
    await overwriteFile(rootDir, 'AGENTS.md', (content) => content.replace(/Sub-Agent/g, 'Agent'))

    expect(validateAgentDocs({ rootDir })).toContain(
      'AGENTS.md is missing required routing phrase: Sub-Agent',
    )
  })

  it('fails when a required user-guide section is missing', async () => {
    const rootDir = await createAgentDocsFixture()
    await overwriteFile(rootDir, 'docs/assistant/features/APP_USER_GUIDE.md', (content) =>
      content.replace('## Quick Start (No Technical Background)', '## Quick Start'),
    )

    expect(validateAgentDocs({ rootDir })).toContain(
      'docs/assistant/features/APP_USER_GUIDE.md is missing required user-guide heading: ## Quick Start (No Technical Background)',
    )
  })
})
