import { describe, expect, it } from 'vitest'

import { createDefaultTimerSettings } from './settings'
import { addPages, observeReaderPage, startSession, undoLastPages } from './session'
import type { ObservedReaderPage } from './contracts'

function createObservation(
  pageNumber: number,
  observedAtMs: number,
  overrides: Partial<ObservedReaderPage> = {},
): ObservedReaderPage {
  return {
    pageNumber,
    observedAtMs,
    verseKey: `2:${pageNumber}`,
    chapterId: '2',
    hizbNumber: 1,
    source: 'quran-com-dom',
    ...overrides,
  }
}

describe('automatic reader tracking', () => {
  it('counts each observed quran.com page once and never infers skipped pages', () => {
    const settings = createDefaultTimerSettings(0)
    let session = startSession(0)

    session = observeReaderPage(session, createObservation(12, 1_000), settings, 1_000)
    session = observeReaderPage(session, createObservation(18, 2_000), settings, 2_000)

    expect(session.totalPages).toBe(2)
    expect(session.observedPages.map((entry) => entry.pageNumber)).toEqual([12, 18])
    expect(session.pageEvents.map((entry) => entry.source)).toEqual(['auto', 'auto'])
  })

  it('does not increment twice when the same page is seen again while scrolling back', () => {
    const settings = createDefaultTimerSettings(0)
    let session = startSession(0)

    session = observeReaderPage(session, createObservation(12, 1_000), settings, 1_000)
    session = observeReaderPage(session, createObservation(13, 2_000), settings, 2_000)
    const repeated = observeReaderPage(session, createObservation(12, 3_000), settings, 3_000)

    expect(repeated.totalPages).toBe(2)
    expect(repeated.observedPages.map((entry) => entry.pageNumber)).toEqual([12, 13])
    expect(repeated.pageEvents).toHaveLength(2)
  })

  it('supports mixed automatic tracking, manual correction, and undo', () => {
    const settings = createDefaultTimerSettings(0)
    let session = startSession(0)

    session = observeReaderPage(session, createObservation(1, 1_000), settings, 1_000)
    session = addPages(session, 2, settings, 2_000)
    session = observeReaderPage(session, createObservation(4, 3_000), settings, 3_000)

    expect(session.totalPages).toBe(4)
    expect(session.pageEvents.map((entry) => entry.source)).toEqual(['auto', 'manual', 'auto'])
    expect(session.observedPages.map((entry) => entry.pageNumber)).toEqual([1, 4])

    const undone = undoLastPages(session, settings, 4_000)
    expect(undone.totalPages).toBe(3)
    expect(undone.pageEvents.map((entry) => entry.source)).toEqual(['auto', 'manual'])
    expect(undone.observedPages.map((entry) => entry.pageNumber)).toEqual([1])
  })

  it('stays usable in manual-only mode when observed metadata is missing', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)

    const ignored = observeReaderPage(
      session,
      createObservation(0, 1_000, { verseKey: null, chapterId: null, hizbNumber: null }),
      settings,
      1_000,
    )
    expect(ignored.totalPages).toBe(0)
    expect(ignored.observedPages).toEqual([])

    const manual = addPages(ignored, 1, settings, 2_000)
    expect(manual.totalPages).toBe(1)
    expect(manual.pageEvents.at(-1)?.source).toBe('manual')
  })
})
