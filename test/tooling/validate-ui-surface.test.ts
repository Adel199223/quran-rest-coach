import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BASE_URL,
  buildValidationSummary,
  createArtifactPaths,
  parseCliArgs,
} from '../../tooling/validate-ui-surface.mjs'

describe('validate-ui-surface helpers', () => {
  it('uses the default base URL and artifact directory', () => {
    const options = parseCliArgs([])

    expect(options.baseUrl).toBe(DEFAULT_BASE_URL)
    expect(options.outputDir.endsWith(path.join('output', 'playwright'))).toBe(true)
  })

  it('accepts custom CLI arguments', () => {
    const options = parseCliArgs([
      '--base-url',
      'http://127.0.0.1:5000',
      '--output-dir',
      '/tmp/qrc-ui',
    ])

    expect(options).toEqual({
      baseUrl: 'http://127.0.0.1:5000',
      outputDir: '/tmp/qrc-ui',
    })
  })

  it('creates the expected artifact names', () => {
    const artifacts = createArtifactPaths('/tmp/qrc-ui')

    expect(artifacts.desktopScreenshot).toBe('/tmp/qrc-ui/session-validation-desktop.png')
    expect(artifacts.mobileScreenshot).toBe('/tmp/qrc-ui/session-validation-mobile.png')
    expect(artifacts.summary).toBe('/tmp/qrc-ui/session-validation-summary.json')
    expect(artifacts.failureScreenshot).toBe('/tmp/qrc-ui/session-validation-failure.png')
    expect(artifacts.trace).toBe('/tmp/qrc-ui/session-validation-trace.zip')
  })

  it('marks summaries as passed or failed based on the error field', () => {
    const passed = buildValidationSummary({
      baseUrl: DEFAULT_BASE_URL,
      checks: [],
      artifacts: {},
      startedAt: '2026-03-17T12:00:00.000Z',
      finishedAt: '2026-03-17T12:01:00.000Z',
    })
    const failed = buildValidationSummary({
      baseUrl: DEFAULT_BASE_URL,
      checks: [],
      artifacts: {},
      error: 'boom',
      startedAt: '2026-03-17T12:00:00.000Z',
      finishedAt: '2026-03-17T12:01:00.000Z',
    })

    expect(passed.status).toBe('passed')
    expect(failed.status).toBe('failed')
    expect(failed.error).toBe('boom')
  })
})
