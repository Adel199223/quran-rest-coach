import {
  addPages,
  advanceSessionTimers,
  endSession,
  pauseSession,
  resumeSession,
  startSession,
  type ActiveSession,
  type ReadingIntent,
  type ReaderContext,
  type SessionHistoryEntry,
  type StudyLaterItem,
  type TimerSettings,
} from '../domain'
import { STUDY_LATER_SCHEMA_VERSION } from '../domain'
import { createDefaultTimerSettings } from '../domain/settings'
import { createPendingStartCountdown, type PendingStartCountdown } from './pendingStart'

export const REVIEW_SCENARIO_IDS = [
  'idle-standalone',
  'idle-simplified-standalone',
  'history-standalone',
  'reading-extension',
  'reading-standalone',
  'reading-standalone-narrow',
  'reading-pressure-halfway-standalone',
  'reading-pressure-final-ten-standalone',
  'reading-pressure-catch-up-standalone',
  'reading-pressure-halfway-extension',
  'reading-pressure-final-ten-extension',
  'pre-start-standalone',
  'pre-start-final-three-standalone',
  'pre-start-extension',
  'break-active-standalone',
  'break-active-standalone-expanded',
  'break-active-extension',
  'settings-calm-standalone',
  'settings-advanced-standalone',
  'resume-saved-standalone',
] as const

export type ReviewScenarioId = (typeof REVIEW_SCENARIO_IDS)[number]

export const REVIEW_NOW_MS = 1_763_200_000_000

export interface ReviewScenarioSeed {
  mode: 'standalone' | 'extension'
  settings: TimerSettings
  activeSession: ActiveSession | null
  pendingStart: PendingStartCountdown | null
  pendingResumeSession: ActiveSession | null
  readerContext: ReaderContext | null
  historyEntries: SessionHistoryEntry[]
  studyLaterItems: StudyLaterItem[]
  selectedReadingIntent: ReadingIntent
  surface: 'session' | 'history' | 'settings'
  reviewWidth: 'default' | 'narrow'
  breakDefaultMoreOptionsOpen: boolean
  settingsAdvancedTimingOpen: boolean
}

function isReviewScenarioId(value: string | null): value is ReviewScenarioId {
  return REVIEW_SCENARIO_IDS.includes(value as ReviewScenarioId)
}

export function getReviewScenarioIdFromSearch(search: string): ReviewScenarioId | null {
  const params = new URLSearchParams(search)
  const reviewId = params.get('review')
  return isReviewScenarioId(reviewId) ? reviewId : null
}

function createTrackedReaderContext(): ReaderContext {
  return {
    schemaVersion: 1,
    routeKind: 'surah',
    locale: 'en',
    url: 'https://quran.com/3',
    chapterId: '3',
    verseKey: '3:14',
    pageNumber: 51,
    hizbNumber: 5,
    automaticTrackingAvailable: true,
    updatedAtMs: REVIEW_NOW_MS,
  }
}

function createPressureSettings(): TimerSettings {
  return {
    ...createDefaultTimerSettings(REVIEW_NOW_MS),
    readingPressureMode: true,
  }
}

function createPreStartSeed(
  readingIntent: ReadingIntent,
  durationSeconds: number,
  elapsedSeconds = 0,
): PendingStartCountdown {
  const seed = createPendingStartCountdown(
    readingIntent,
    durationSeconds,
    REVIEW_NOW_MS - elapsedSeconds * 1000,
  )

  if (!seed) {
    throw new Error('Expected a pending start countdown in the review seed.')
  }

  return seed
}

function createReviewHistory(settings: TimerSettings): SessionHistoryEntry[] {
  let session = startSession(REVIEW_NOW_MS - 600_000, 'flow', settings)
  session = addPages(session, 2, settings, REVIEW_NOW_MS - 540_000)
  session = resumeSession(session, settings, REVIEW_NOW_MS - 500_000)
  session = addPages(session, 1, settings, REVIEW_NOW_MS - 460_000)
  const result = endSession(session, REVIEW_NOW_MS - 420_000)
  return result.historyEntry ? [result.historyEntry] : []
}

function createReadingSession(
  settings: TimerSettings,
  readingIntent: ReadingIntent = 'understand',
): ActiveSession {
  const session = startSession(REVIEW_NOW_MS - 30_000, readingIntent, settings)
  return addPages(session, 1, settings, REVIEW_NOW_MS - 5_000)
}

function createStandaloneReadingSession(
  settings: TimerSettings,
  readingIntent: ReadingIntent = 'recover-focus',
): ActiveSession {
  const session = startSession(REVIEW_NOW_MS - 30_000, readingIntent, settings)
  return addPages(session, 1, settings, REVIEW_NOW_MS - 5_000)
}

function createPressureReadingSession(
  settings: TimerSettings,
  remainingSeconds: number,
  readingIntent: ReadingIntent = 'recover-focus',
): ActiveSession {
  const session = addPages(
    startSession(REVIEW_NOW_MS - 120_000, readingIntent, settings),
    1,
    settings,
    REVIEW_NOW_MS - 60_000,
  )

  if (!session.paceState) {
    return session
  }

  const originalDurationSeconds =
    remainingSeconds <= 10 ? 20 : remainingSeconds * 2
  const elapsedSeconds = Math.max(0, originalDurationSeconds - remainingSeconds)

  return {
    ...session,
    updatedAtMs: REVIEW_NOW_MS,
    paceState: {
      ...session.paceState,
      startedAtMs: REVIEW_NOW_MS - elapsedSeconds * 1000,
      deadlineAtMs: REVIEW_NOW_MS + remainingSeconds * 1000,
      originalDurationSeconds,
      deadlineSnoozeCount: 0,
      catchUpEndsAtMs: null,
    },
  }
}

function createBreakSession(
  settings: TimerSettings,
  readingIntent: ReadingIntent = 'recover-focus',
): ActiveSession {
  let session = startSession(REVIEW_NOW_MS - 180_000, readingIntent, settings)
  session = addPages(session, 2, settings, REVIEW_NOW_MS - 120_000)
  return session
}

function createPendingResumeSession(settings: TimerSettings): ActiveSession {
  let session = startSession(REVIEW_NOW_MS - 240_000, 'memorize', settings)
  session = addPages(session, 1, settings, REVIEW_NOW_MS - 180_000)
  return pauseSession(session, REVIEW_NOW_MS - 120_000)
}

function createPressureCatchUpSession(
  settings: TimerSettings,
  readingIntent: ReadingIntent = 'recover-focus',
): ActiveSession {
  const paceSettings = {
    ...settings,
    paceSecondsPerTwoPages: 20,
  }
  let session = startSession(REVIEW_NOW_MS - 25_000, readingIntent, paceSettings)
  session = addPages(session, 1, paceSettings, REVIEW_NOW_MS - 20_000)
  return advanceSessionTimers(session, paceSettings, REVIEW_NOW_MS)
}

function createStudyLaterSeedItems(): StudyLaterItem[] {
  return [
    {
      schemaVersion: STUDY_LATER_SCHEMA_VERSION,
      id: 'study_seed_3-8',
      savedAtMs: REVIEW_NOW_MS - 90_000,
      sessionId: 'seed-session',
      readingIntent: 'understand',
      routeKind: 'surah',
      url: 'https://quran.com/3/8',
      chapterId: '3',
      verseKey: '3:8',
      pageNumber: 50,
      hizbNumber: 5,
    },
  ]
}

export function buildReviewScenarioSeed(scenarioId: ReviewScenarioId): ReviewScenarioSeed {
  const settings = createDefaultTimerSettings(REVIEW_NOW_MS)
  const pressureSettings = createPressureSettings()
  const historyEntries = createReviewHistory(settings)
  const studyLaterItems = createStudyLaterSeedItems()

  switch (scenarioId) {
    case 'idle-simplified-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'history-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'understand',
        surface: 'history',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-extension':
      return {
        mode: 'extension',
        settings,
        activeSession: createReadingSession(settings, 'understand'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'understand',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: createStandaloneReadingSession(settings, 'understand'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'understand',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-standalone-narrow':
      return {
        mode: 'standalone',
        settings,
        activeSession: createStandaloneReadingSession(settings, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'narrow',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-pressure-halfway-standalone':
      return {
        mode: 'standalone',
        settings: pressureSettings,
        activeSession: createPressureReadingSession(pressureSettings, 32, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-pressure-final-ten-standalone':
      return {
        mode: 'standalone',
        settings: pressureSettings,
        activeSession: createPressureReadingSession(pressureSettings, 9, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-pressure-catch-up-standalone':
      return {
        mode: 'standalone',
        settings: pressureSettings,
        activeSession: createPressureCatchUpSession(pressureSettings, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-pressure-halfway-extension':
      return {
        mode: 'extension',
        settings: pressureSettings,
        activeSession: createPressureReadingSession(pressureSettings, 32, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'reading-pressure-final-ten-extension':
      return {
        mode: 'extension',
        settings: pressureSettings,
        activeSession: createPressureReadingSession(pressureSettings, 9, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'pre-start-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: createPreStartSeed('recover-focus', settings.preStartCountdownSeconds),
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'pre-start-final-three-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: createPreStartSeed(
          'recover-focus',
          settings.preStartCountdownSeconds,
          Math.max(0, settings.preStartCountdownSeconds - 3),
        ),
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'pre-start-extension':
      return {
        mode: 'extension',
        settings,
        activeSession: null,
        pendingStart: createPreStartSeed('understand', settings.preStartCountdownSeconds),
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'understand',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'break-active-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: createBreakSession(settings, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'break-active-standalone-expanded':
      return {
        mode: 'standalone',
        settings,
        activeSession: createBreakSession(settings, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: true,
        settingsAdvancedTimingOpen: false,
      }
    case 'break-active-extension':
      return {
        mode: 'extension',
        settings,
        activeSession: createBreakSession(settings, 'recover-focus'),
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'recover-focus',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'settings-calm-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'flow',
        surface: 'settings',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'settings-advanced-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'flow',
        surface: 'settings',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: true,
      }
    case 'resume-saved-standalone':
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: createPendingResumeSession(settings),
        readerContext: createTrackedReaderContext(),
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'memorize',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
    case 'idle-standalone':
    default:
      return {
        mode: 'standalone',
        settings,
        activeSession: null,
        pendingStart: null,
        pendingResumeSession: null,
        readerContext: null,
        historyEntries,
        studyLaterItems,
        selectedReadingIntent: 'flow',
        surface: 'session',
        reviewWidth: 'default',
        breakDefaultMoreOptionsOpen: false,
        settingsAdvancedTimingOpen: false,
      }
  }
}
