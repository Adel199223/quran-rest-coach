import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(currentDir, '..')
const outdir = path.join(repoRoot, 'dist', 'extension')
const extensionRoot = path.join(repoRoot, 'src', 'extension')

async function buildEntry(entryPoints, format = 'esm') {
  await build({
    entryPoints,
    bundle: true,
    format,
    platform: 'browser',
    target: ['chrome120', 'edge120'],
    outdir,
    sourcemap: false,
    logLevel: 'info',
    jsx: 'automatic',
    minify: true,
    entryNames: '[name]',
    assetNames: '[name]',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    loader: {
      '.png': 'file',
      '.svg': 'file',
    },
  })
}

async function main() {
  await mkdir(outdir, { recursive: true })
  await rm(path.join(outdir, 'background.js'), { force: true })
  await rm(path.join(outdir, 'content.js'), { force: true })
  await rm(path.join(outdir, 'sidepanel.js'), { force: true })
  await rm(path.join(outdir, 'sidepanel.css'), { force: true })

  await buildEntry([
    path.join(extensionRoot, 'background.ts'),
    path.join(extensionRoot, 'sidepanel.tsx'),
  ])

  await buildEntry([path.join(extensionRoot, 'content.tsx')], 'iife')

  await Promise.all([
    cp(path.join(extensionRoot, 'manifest.json'), path.join(outdir, 'manifest.json')),
    cp(path.join(extensionRoot, 'sidepanel.html'), path.join(outdir, 'sidepanel.html')),
  ])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
