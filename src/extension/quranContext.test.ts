import { beforeEach, describe, expect, it } from 'vitest'

import {
  collectObservedReaderPages,
  enrichReaderContext,
  extractObservedReaderPageFromElement,
  findPrimaryObservedReaderPage,
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

  it('prefers the viewport-focused observation for the live reader context', () => {
    document.body.innerHTML = `
      <main>
        <div data-page="51" data-verse-key="3:10" data-chapter-id="3" data-hizb="5"></div>
        <div data-page="54" data-verse-key="3:15" data-chapter-id="3" data-hizb="6"></div>
      </main>
    `

    const [olderPage, currentPage] = Array.from(document.querySelectorAll('[data-page]'))
    if (!(olderPage instanceof HTMLElement) || !(currentPage instanceof HTMLElement)) {
      throw new Error('Expected two tracked quran.com elements in the fixture DOM.')
    }

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1_000,
    })

    olderPage.getBoundingClientRect = () =>
      ({
        top: -160,
        bottom: 120,
        left: 0,
        right: 0,
        width: 400,
        height: 280,
        x: 0,
        y: -160,
        toJSON: () => ({}),
      }) as DOMRect

    currentPage.getBoundingClientRect = () =>
      ({
        top: 320,
        bottom: 760,
        left: 0,
        right: 0,
        width: 400,
        height: 440,
        x: 0,
        y: 320,
        toJSON: () => ({}),
      }) as DOMRect

    const observations = collectObservedReaderPages(document, 4_000)
    const primary = findPrimaryObservedReaderPage(document, 4_000)

    expect(primary).toMatchObject({
      pageNumber: 54,
      verseKey: '3:15',
      chapterId: '3',
      hizbNumber: 6,
    })

    const context = enrichReaderContext(
      parseReaderContextFromUrl('https://quran.com/3', 4_000),
      observations,
      primary,
    )

    expect(context.pageNumber).toBe(54)
    expect(context.verseKey).toBe('3:15')
    expect(context.hizbNumber).toBe(6)
  })
})
