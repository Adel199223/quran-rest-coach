import { beforeEach, describe, expect, it } from 'vitest'

import {
  collectObservedReaderPages,
  enrichReaderContext,
  extractObservedReaderPageFromElement,
  parseReaderContextFromUrl,
} from './quranContext'

describe('quran.com context helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('parses locale-prefixed and non-prefixed quran.com reader routes', () => {
    const verseContext = parseReaderContextFromUrl('https://quran.com/pt/2/255', 500)
    expect(verseContext.locale).toBe('pt')
    expect(verseContext.routeKind).toBe('verse')
    expect(verseContext.chapterId).toBe('2')
    expect(verseContext.verseKey).toBe('2:255')

    const pageContext = parseReaderContextFromUrl('https://quran.com/page/12', 900)
    expect(pageContext.locale).toBe('en')
    expect(pageContext.routeKind).toBe('page')
    expect(pageContext.pageNumber).toBe(12)

    const hizbContext = parseReaderContextFromUrl('https://quran.com/ar/hizb/7', 1_200)
    expect(hizbContext.locale).toBe('ar')
    expect(hizbContext.routeKind).toBe('hizb')
    expect(hizbContext.hizbNumber).toBe(7)
  })

  it('extracts and dedupes observed pages from quran.com data attributes', () => {
    document.body.innerHTML = `
      <main>
        <div data-page="12" data-verse-key="2:255" data-chapter-id="2" data-hizb="4"></div>
        <div data-page="12" data-verse-key="2:256" data-chapter-id="2" data-hizb="4"></div>
        <div data-page="13" data-chapter-id="2"></div>
      </main>
    `

    const firstElement = document.querySelector('[data-page="12"]')
    if (!firstElement) {
      throw new Error('Expected a page-tracked element in the fixture DOM.')
    }

    const observation = extractObservedReaderPageFromElement(firstElement, 2_000)
    expect(observation).toMatchObject({
      pageNumber: 12,
      verseKey: '2:255',
      chapterId: '2',
      hizbNumber: 4,
      observedAtMs: 2_000,
      source: 'quran-com-dom',
    })

    const collected = collectObservedReaderPages(document, 2_000)
    expect(collected.map((entry) => entry.pageNumber)).toEqual([12, 13])

    const enriched = enrichReaderContext(
      parseReaderContextFromUrl('https://quran.com/pt/2/255', 2_000),
      collected,
    )
    expect(enriched.pageNumber).toBe(12)
    expect(enriched.hizbNumber).toBe(4)
    expect(enriched.automaticTrackingAvailable).toBe(true)
  })

  it('falls back cleanly when quran.com metadata is missing', () => {
    const element = document.createElement('div')
    element.setAttribute('data-verse-key', '2:255')
    element.setAttribute('data-chapter-id', '2')

    expect(extractObservedReaderPageFromElement(element, 3_000)).toBeNull()
    expect(collectObservedReaderPages(element, 3_000)).toEqual([])

    const context = enrichReaderContext(
      parseReaderContextFromUrl('https://quran.com/2', 3_000),
      [],
    )
    expect(context.automaticTrackingAvailable).toBe(false)
    expect(context.pageNumber).toBeNull()
  })
})
