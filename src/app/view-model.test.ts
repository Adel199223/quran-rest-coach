import { describe, expect, it } from 'vitest'

import type { ReaderContext } from '../domain/contracts'
import { createDefaultTimerSettings } from '../domain/settings'
import { addPages, advanceSessionTimers, endSession, pauseSession, startSession } from '../domain/session'
import {
  applyCalmFocusDefaults,
  buildCompletedSessionSummary,
  buildEstimatedToBreakLabel,
  buildHistoryEntries,
  buildNextGoalLabel,
  buildNextBreakLabel,
  buildParkForLaterLabel,
  buildReadingPressureCue,
  buildResumeAnchorLabel,
  buildSummaryLabel,
  buildStudyLaterEntries,
  buildTrackingCopy,
  buildTrackingLabel,
} from './view-model'

function createContext(overrides: Partial<ReaderContext>): ReaderContext {
  return {
    schemaVersion: 1,
    routeKind: 'unknown',
    locale: 'en',
    url: 'https://quran.com',
    chapterId: null,
    verseKey: null,
    pageNumber: null,
    hizbNumber: null,
    automaticTrackingAvailable: false,
    updatedAtMs: 1_000,
    ...overrides,
  }
}

describe('view-model tracking helpers', () => {
  it('guides users to a supported reading route when the route is not readable yet', () => {
    const context = createContext({ routeKind: 'unknown' })

    expect(buildTrackingLabel(context)).toBe('Open a reading view')
    expect(buildTrackingCopy(context)).toMatch(/open a reading view for automatic page tracking/i)
  })

  it('keeps automatic tracking messaging for readable Quran.com views', () => {
    const context = createContext({
      routeKind: 'surah',
      chapterId: '2',
      pageNumber: 2,
      automaticTrackingAvailable: true,
    })

    expect(buildTrackingLabel(context)).toBe('Automatic tracking on')
    expect(buildTrackingCopy(context)).toBe('')
  })

  it('uses manual-page wording for supported views without stable metadata', () => {
    const context = createContext({
      routeKind: 'surah',
      chapterId: '2',
      automaticTrackingAvailable: false,
    })

    expect(buildTrackingLabel(context)).toBe('Manual page logging')
    expect(buildTrackingCopy(context)).toMatch(/log a missed page manually if needed/i)
  })
})

describe('view-model reading support helpers', () => {
  it('builds a literal next-step label from the reading intent', () => {
    expect(buildNextGoalLabel('understand')).toBe('Read 1 page, then check the meaning.')
    expect(buildNextGoalLabel('recover-focus')).toBe('Read 1 page, then pause and check in.')
  })

  it('uses the current Quran.com page as the resume anchor when available', () => {
    const context = createContext({
      routeKind: 'surah',
      chapterId: '3',
      verseKey: '3:14',
      pageNumber: 51,
      automaticTrackingAvailable: true,
    })

    expect(buildResumeAnchorLabel(startSession(0, 'understand'), context)).toBe(
      'Page 51, verse 3:14',
    )
  })

  it('offers a park-for-later action only on a readable Quran.com route', () => {
    expect(buildParkForLaterLabel(createContext({ routeKind: 'unknown' }))).toBeNull()
    expect(
      buildParkForLaterLabel(
        createContext({ routeKind: 'surah', verseKey: '3:14', automaticTrackingAvailable: true }),
      ),
    ).toBe('Park this verse for later')
  })

  it('builds a study-view link for saved verse items', () => {
    const [item] = buildStudyLaterEntries(
      [
        {
          schemaVersion: 1,
          id: 'study_1',
          savedAtMs: 1_763_200_000_000,
          sessionId: 'session-1',
          readingIntent: 'understand',
          routeKind: 'surah',
          url: 'https://quran.com/3',
          chapterId: '3',
          verseKey: '3:14',
          pageNumber: 51,
          hizbNumber: 5,
        },
      ],
      'en',
    )

    expect(item?.studyUrl).toBe('https://quran.com/3/14')
  })
})

describe('view-model break timing helpers', () => {
  it('uses page-first language in the summary label while reading', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)

    expect(buildSummaryLabel(session, settings)).toBe('Micro break in 2 pages.')
  })

  it('uses page-first language for the next break cue', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)

    expect(buildNextBreakLabel(session, settings)).toBe('Micro break in 2 pages')
  })

  it('shows an exact countdown by default in the pressure-focused build', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0)

    expect(buildEstimatedToBreakLabel(session, settings, 0)).toBe('2:10')
  })

  it('supports an optional live countdown between breaks when enabled', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      showBetweenBreakCountdown: true,
    }
    const session = startSession(0)

    expect(buildEstimatedToBreakLabel(session, settings, 45_000)).toBe('1:25')
  })

  it('keeps pressure cues disabled when both reading countdown toggles are off', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      showBetweenBreakCountdown: false,
      readingPressureMode: false,
    }
    const session = startSession(0)

    expect(buildReadingPressureCue(session, settings, 45_000)).toBeNull()
  })

  it('builds a neutral exact countdown when only the reading countdown is enabled', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      showBetweenBreakCountdown: true,
    }
    const session = startSession(0)

    expect(buildReadingPressureCue(session, settings, 45_000)).toEqual({
      remainingSeconds: 85,
      exactCountdownVisible: true,
      mode: 'reading-window',
      phase: 'none',
      metricLabel: 'Time to next break',
      displayLabel: '1:25',
      chipSubtitle: '1:25 left',
      snoozeAvailable: false,
      pagesLate: 0,
    })
  })

  it('activates a halfway cue when pressure mode reaches the midpoint', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      readingPressureMode: true,
    }
    const session = startSession(0, 'flow', settings)

    expect(buildReadingPressureCue(session, settings, 70_000)).toEqual({
      remainingSeconds: 60,
      exactCountdownVisible: true,
      mode: 'reading-window',
      phase: 'halfway',
      metricLabel: 'Halfway to deadline',
      displayLabel: '1:00',
      chipSubtitle: 'Halfway · 1:00',
      snoozeAvailable: false,
      pagesLate: 0,
    })
  })

  it('activates a final-ten cue when pressure mode reaches the last ten seconds', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      readingPressureMode: true,
    }
    const session = startSession(0, 'flow', settings)

    expect(buildReadingPressureCue(session, settings, 121_000)).toEqual({
      remainingSeconds: 9,
      exactCountdownVisible: true,
      mode: 'reading-window',
      phase: 'final-ten',
      metricLabel: 'Final 10 seconds',
      displayLabel: '9s left',
      chipSubtitle: '9s left',
      snoozeAvailable: true,
      pagesLate: 0,
    })
  })

  it('skips the halfway phase when the full countdown is already short', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      paceSecondsPerTwoPages: 40,
      readingPressureMode: true,
    }
    const session = addPages(startSession(0), 1, settings, 0)

    expect(buildReadingPressureCue(session, settings, 9_000)?.phase).toBe('none')
    expect(buildReadingPressureCue(session, settings, 12_000)?.phase).toBe('final-ten')
  })

  it('clears pressure cues when progress resets, the session pauses, or a break opens', () => {
    const settings = {
      ...createDefaultTimerSettings(0),
      readingPressureMode: true,
    }
    const readingSession = startSession(0)
    expect(buildReadingPressureCue(readingSession, settings, 70_000)?.phase).toBe('halfway')

    const afterPageLog = addPages(readingSession, 1, settings, 70_000)
    expect(buildReadingPressureCue(afterPageLog, settings, 70_000)?.phase).toBe('none')

    const pausedSession = pauseSession(afterPageLog, 71_000)
    expect(buildReadingPressureCue(pausedSession, settings, 71_000)).toBeNull()

    const breakSession = addPages(startSession(0), 2, settings, 1_000)
    expect(buildReadingPressureCue(breakSession, settings, 1_000)).toBeNull()
    expect(buildReadingPressureCue(null, settings, 1_000)).toBeNull()
  })

  it('applies calm-focus defaults without changing the manual pace settings', () => {
    const nextValues = applyCalmFocusDefaults({
      paceSecondsPerTwoPages: 145,
      shortBreakEveryPages: 2,
      shortBreakSeconds: 15,
      mediumBreakEveryPages: 5,
      mediumBreakSeconds: 60,
      longBreakEveryPages: 10,
      longBreakSeconds: 120,
      showBetweenBreakCountdown: true,
      readingPressureMode: true,
      deadlineWarningCueEnabled: true,
      showRestCountdown: true,
      softChime: true,
      preStartCountdownSeconds: 12,
      preStartWarningCueEnabled: false,
      simplifiedReadingPanel: false,
      reducedMotion: false,
      largeText: false,
      highContrast: true,
      sepiaTheme: false,
      resumeOnReopen: true,
    })

    expect(nextValues.paceSecondsPerTwoPages).toBe(145)
    expect(nextValues.showBetweenBreakCountdown).toBe(false)
    expect(nextValues.readingPressureMode).toBe(false)
    expect(nextValues.deadlineWarningCueEnabled).toBe(false)
    expect(nextValues.showRestCountdown).toBe(false)
    expect(nextValues.softChime).toBe(false)
    expect(nextValues.preStartCountdownSeconds).toBe(12)
    expect(nextValues.preStartWarningCueEnabled).toBe(false)
    expect(nextValues.simplifiedReadingPanel).toBe(true)
    expect(nextValues.largeText).toBe(true)
    expect(nextValues.sepiaTheme).toBe(true)
    expect(nextValues.highContrast).toBe(true)
  })

  it('builds a recovering score summary with short reasons after catch-up recovery', () => {
    const settings = createDefaultTimerSettings(0)
    const session = startSession(0, 'flow', settings)
    const catchUp = advanceSessionTimers(session, settings, 131_000)
    const recovered = addPages(catchUp, 2, settings, 140_000)
    const resolved = advanceSessionTimers(recovered, settings, 146_000)
    const historyEntry = endSession(resolved, 150_000).historyEntry

    expect(historyEntry).not.toBeNull()

    const [historyView] = buildHistoryEntries([historyEntry!], 'en')
    const summary = buildCompletedSessionSummary(historyEntry!)

    expect(historyView?.paceScoreLabel).toBe('Recovering')
    expect(historyView?.paceScoreReasons).toContain('Recovered 1')
    expect(summary?.paceScoreReasons).toContain('Recovered 1')
    expect(summary?.recoveredWindows).toBe(1)
    expect(summary?.bestOnTimeStreak).toBe(0)
  })
})
