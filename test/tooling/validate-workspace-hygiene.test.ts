import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { validateWorkspaceHygiene } from '../../tooling/validate-workspace-hygiene.mjs'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const tempRoots: string[] = []

async function createWorkspaceFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'qrc-workspace-hygiene-'))
  tempRoots.push(rootDir)

  await mkdir(path.join(rootDir, '.vscode'), { recursive: true })
  await writeFile(path.join(rootDir, '.gitignore'), await readFile(path.join(PROJECT_ROOT, '.gitignore')))
  await writeFile(
    path.join(rootDir, '.vscode/settings.json'),
    await readFile(path.join(PROJECT_ROOT, '.vscode/settings.json')),
  )

  return rootDir
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((rootDir) => rm(rootDir, { force: true, recursive: true })),
  )
})

describe('validateWorkspaceHygiene', () => {
  it('passes for the project root', () => {
    expect(validateWorkspaceHygiene({ rootDir: PROJECT_ROOT })).toEqual([])
  })

  it('fails when output is not ignored', async () => {
    const rootDir = await createWorkspaceFixture()
    await writeFile(
      path.join(rootDir, '.gitignore'),
      (await readFile(path.join(rootDir, '.gitignore'), 'utf8')).replace('output/\n', ''),
    )

    expect(validateWorkspaceHygiene({ rootDir })).toContain('.gitignore must ignore output/')
  })

  it('fails when a required exclude is missing', async () => {
    const rootDir = await createWorkspaceFixture()
    const settingsPath = path.join(rootDir, '.vscode/settings.json')
    const settings = JSON.parse(await readFile(settingsPath, 'utf8'))
    delete settings['search.exclude']['**/output/**']
    await writeFile(settingsPath, JSON.stringify(settings, null, 2))

    expect(validateWorkspaceHygiene({ rootDir })).toContain(
      '.vscode/settings.json is missing search exclude: **/output/**',
    )
  })
})
