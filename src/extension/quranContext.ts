import {
  READER_CONTEXT_SCHEMA_VERSION,
  type ObservedReaderPage,
  type ReaderContext,
  type ReaderRouteKind,
} from '../domain'

const KNOWN_LOCALES = new Set([
  'ar',
  'bn',
  'en',
  'es',
  'fa',
  'fr',
  'id',
  'it',
  'ms',
  'nl',
  'pt',
  'ru',
  'sq',
  'sw',
  'th',
  'tr',
  'ur',
  'vi',
  'zh',
])

const READER_CONTAINER_SELECTORS = [
  '[data-page][data-verse-key]',
  '[data-page][data-chapter-id]',
]

function normalizeSegments(url: URL): { locale: string; segments: string[] } {
  const rawSegments = url.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (rawSegments.length === 0) {
    return { locale: 'en', segments: [] }
  }

  const [maybeLocale, ...rest] = rawSegments
  if (KNOWN_LOCALES.has(maybeLocale)) {
    return {
      locale: maybeLocale,
      segments: rest,
    }
  }

  return {
    locale: 'en',
    segments: rawSegments,
  }
}

function parsePositiveSegment(segment: string | undefined): number | null {
  if (!segment) {
    return null
  }

  const parsed = Number.parseInt(segment, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function buildContext(
  url: URL,
  locale: string,
  routeKind: ReaderRouteKind,
  nowMs: number,
  values: Partial<ReaderContext> = {},
): ReaderContext {
  return {
    schemaVersion: READER_CONTEXT_SCHEMA_VERSION,
    routeKind,
    locale,
    url: url.href,
    chapterId: values.chapterId ?? null,
    verseKey: values.verseKey ?? null,
    pageNumber: values.pageNumber ?? null,
    hizbNumber: values.hizbNumber ?? null,
    automaticTrackingAvailable: values.automaticTrackingAvailable ?? false,
    updatedAtMs: nowMs,
  }
}

export function parseReaderContextFromUrl(
  urlInput: string,
  nowMs = Date.now(),
): ReaderContext {
  let url: URL
  try {
    url = new URL(urlInput)
  } catch {
    return buildContext(new URL('https://quran.com'), 'en', 'unknown', nowMs)
  }

  const { locale, segments } = normalizeSegments(url)
  const [first, second] = segments

  if (first === 'page') {
    return buildContext(url, locale, 'page', nowMs, {
      pageNumber: parsePositiveSegment(second),
    })
  }

  if (first === 'juz') {
    return buildContext(url, locale, 'juz', nowMs)
  }

  if (first === 'hizb') {
    return buildContext(url, locale, 'hizb', nowMs, {
      hizbNumber: parsePositiveSegment(second),
    })
  }

  if (first === 'rub') {
    return buildContext(url, locale, 'rub', nowMs)
  }

  const firstAsNumber = parsePositiveSegment(first)
  const secondAsNumber = parsePositiveSegment(second)

  if (firstAsNumber && secondAsNumber) {
    return buildContext(url, locale, 'verse', nowMs, {
      chapterId: String(firstAsNumber),
      verseKey: `${firstAsNumber}:${secondAsNumber}`,
    })
  }

  if (firstAsNumber) {
    return buildContext(url, locale, 'surah', nowMs, {
      chapterId: String(firstAsNumber),
    })
  }

  if (segments.length === 1 && first) {
    return buildContext(url, locale, 'surah', nowMs)
  }

  if (segments.length === 2 && first && secondAsNumber) {
    return buildContext(url, locale, 'verse', nowMs)
  }

  return buildContext(url, locale, 'unknown', nowMs)
}

export function extractObservedReaderPageFromElement(
  element: Element,
  nowMs = Date.now(),
): ObservedReaderPage | null {
  const pageNumber = parsePositiveSegment(element.getAttribute('data-page') ?? undefined)
  if (!pageNumber) {
    return null
  }

  const rawHizb = parsePositiveSegment(element.getAttribute('data-hizb') ?? undefined)
  return {
    pageNumber,
    verseKey: element.getAttribute('data-verse-key'),
    chapterId: element.getAttribute('data-chapter-id'),
    hizbNumber: rawHizb,
    observedAtMs: nowMs,
    source: 'quran-com-dom',
  }
}

export function collectObservedReaderPages(
  root: ParentNode = document,
  nowMs = Date.now(),
): ObservedReaderPage[] {
  const collected: ObservedReaderPage[] = []
  const seenPages = new Set<number>()

  for (const selector of READER_CONTAINER_SELECTORS) {
    const matches = root.querySelectorAll(selector)
    for (const match of matches) {
      const observation = extractObservedReaderPageFromElement(match, nowMs)
      if (!observation || seenPages.has(observation.pageNumber)) {
        continue
      }

      seenPages.add(observation.pageNumber)
      collected.push(observation)
    }
  }

  return collected.sort((left, right) => left.pageNumber - right.pageNumber)
}

export function findPrimaryObservedReaderPage(
  root: ParentNode = document,
  nowMs = Date.now(),
): ObservedReaderPage | null {
  const viewportHeight =
    typeof window !== 'undefined'
      ? window.innerHeight || document.documentElement.clientHeight
      : 0

  const candidates: Array<{
    observation: ObservedReaderPage
    intersectsViewport: boolean
    visibleHeight: number
    centerDistance: number
  }> = []

  for (const selector of READER_CONTAINER_SELECTORS) {
    const matches = root.querySelectorAll(selector)
    for (const match of matches) {
      const observation = extractObservedReaderPageFromElement(match, nowMs)
      if (!observation) {
        continue
      }

      const rect = match.getBoundingClientRect()
      const intersectsViewport =
        viewportHeight > 0 && rect.bottom > 0 && rect.top < viewportHeight
      const visibleHeight = intersectsViewport
        ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
        : 0
      const centerDistance =
        viewportHeight > 0
          ? Math.abs(rect.top + rect.height / 2 - viewportHeight / 2)
          : Number.POSITIVE_INFINITY

      candidates.push({
        observation,
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

    return right.observation.pageNumber - left.observation.pageNumber
  })

  return candidates[0]?.observation ?? null
}

export function enrichReaderContext(
  baseContext: ReaderContext,
  observations: ObservedReaderPage[],
  primaryObservation: ObservedReaderPage | null = observations[0] ?? null,
): ReaderContext {
  return {
    ...baseContext,
    chapterId: primaryObservation?.chapterId ?? baseContext.chapterId ?? null,
    verseKey: primaryObservation?.verseKey ?? baseContext.verseKey ?? null,
    pageNumber: primaryObservation?.pageNumber ?? baseContext.pageNumber ?? null,
    hizbNumber: primaryObservation?.hizbNumber ?? baseContext.hizbNumber ?? null,
    automaticTrackingAvailable: observations.length > 0,
  }
}
