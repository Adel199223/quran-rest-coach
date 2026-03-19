import type {
  ActiveSession,
  BreakKind,
  BreakTier,
  ReaderContext,
  ReadingIntent,
  SessionHistoryEntry,
  StudyLaterItem,
  TimerSettings,
} from '../domain'
import {
  computeHybridNudge,
  createDefaultTimerSettings,
  getNextBreakHint,
  STUDY_LATER_SCHEMA_VERSION,
} from '../domain'
import type {
  CompletedSessionSummaryView,
  HistoryEntryView,
  ReadingPressureCue,
  ReadingIntentOptionView,
  SessionTimelineEntry,
  SettingsFormValues,
  StudyLaterItemView,
} from '../components'
import {
  formatBreakKind,
  formatApproxDuration,
  formatClockDuration,
  formatPageLabel,
  formatSessionDate,
  formatTimeStamp,
} from '../lib/format'

const READING_INTENT_META: Record<
  ReadingIntent,
  { label: string; detail: string; nextStep: string }
> = {
  flow: {
    label: 'Flow',
    detail: 'Keep a steady pace with fewer interruptions.',
    nextStep: 'Read 2 pages before checking in again.',
  },
  understand: {
    label: 'Understand',
    detail: 'Read a smaller chunk, then revisit the meaning.',
    nextStep: 'Read 1 page, then check the meaning.',
  },
  memorize: {
    label: 'Memorize',
    detail: 'Use a short chunk you can review once right away.',
    nextStep: 'Read 1 page, then review it once.',
  },
  'recover-focus': {
    label: 'Recover focus',
    detail: 'Restart with the smallest next step.',
    nextStep: 'Read 1 page, then pause and check in.',
  },
}

export const BREAK_SUGGESTIONS: Record<BreakKind, string> = {
  micro: 'Blink slowly, relax your jaw, and look away from the screen for a moment.',
  short: 'Look across the room, relax your shoulders, and take a few slower breaths.',
  long: 'Stand up, stretch, and come back when you are ready to read again.',
}

interface PaceReasonOptions {
  limit?: number
  lateLabel?: 'late-now' | 'ended-late'
}

interface PaceReasonInput {
  totalWindows: number
  onTimeWindows: number
  recoveredWindows: number
  bestOnTimeStreak: number
  deadlineSnoozeCount: number
  latePages: number
}

function buildPaceScoreReasons(
  input: PaceReasonInput,
  options: PaceReasonOptions = {},
): string[] {
  const { limit = 2, lateLabel = 'ended-late' } = options
  const reasons: string[] = []

  if (input.latePages > 0) {
    reasons.push(
      lateLabel === 'late-now'
        ? `${formatPageLabel(input.latePages)} late now`
        : `Ended ${formatPageLabel(input.latePages)} late`,
    )
  }

  if (input.totalWindows > 0) {
    reasons.push(`On-time ${input.onTimeWindows}/${input.totalWindows}`)
  }

  if (input.recoveredWindows > 0) {
    reasons.push(`Recovered ${input.recoveredWindows}`)
  }

  if (input.bestOnTimeStreak > 1) {
    reasons.push(`Best streak ${input.bestOnTimeStreak}`)
  }

  if (input.deadlineSnoozeCount > 0) {
    reasons.push(`Deadline extensions ${input.deadlineSnoozeCount}`)
  }

  return reasons.slice(0, limit)
}

export function getPaceScoreLabel(score: number): string {
  if (score >= 90) {
    return 'Locked in'
  }

  if (score >= 75) {
    return 'On pace'
  }

  if (score >= 50) {
    return 'Recovering'
  }

  return 'Reset the target'
}

export function getThemeMode(settings: TimerSettings): 'contrast' | 'sepia' | 'plain' {
  if (settings.highContrast) {
    return 'contrast'
  }

  if (settings.sepiaTheme) {
    return 'sepia'
  }

  return 'plain'
}

export function getStatusLabel(session: ActiveSession | null): string {
  if (!session || session.status === 'idle') {
    return 'Ready'
  }

  switch (session.status) {
    case 'reading':
      return session.currentPagesLate > 0 ? 'Catching up' : 'Reading'
    case 'paused':
      return 'Paused'
    case 'break':
      return 'Resting'
    default:
      return 'Ready'
  }
}

export function buildSettingsFormValues(settings: TimerSettings): SettingsFormValues {
  const [shortTier, mediumTier, longTier] = [...settings.breakTiers].sort(
    (left, right) => left.everyPages - right.everyPages,
  )

  return {
    paceSecondsPerTwoPages: settings.paceSecondsPerTwoPages,
    shortBreakEveryPages: shortTier?.everyPages ?? 2,
    shortBreakSeconds: shortTier?.durationSeconds ?? 15,
    mediumBreakEveryPages: mediumTier?.everyPages ?? 5,
    mediumBreakSeconds: mediumTier?.durationSeconds ?? 60,
    longBreakEveryPages: longTier?.everyPages ?? 10,
    longBreakSeconds: longTier?.durationSeconds ?? 120,
    showBetweenBreakCountdown: settings.showBetweenBreakCountdown,
    readingPressureMode: settings.readingPressureMode,
    deadlineWarningCueEnabled: settings.deadlineWarningCueEnabled,
    showRestCountdown: settings.showRestCountdown,
    softChime: settings.softChimeEnabled,
    preStartCountdownSeconds: settings.preStartCountdownSeconds,
    preStartWarningCueEnabled: settings.preStartWarningCueEnabled,
    simplifiedReadingPanel: settings.simplifiedReadingPanel,
    reducedMotion: settings.reducedMotion,
    largeText: settings.largeText,
    highContrast: settings.highContrast,
    sepiaTheme: settings.sepiaTheme,
    resumeOnReopen: settings.resumeOnReopen,
  }
}

export function buildBreakTiers(values: SettingsFormValues): BreakTier[] {
  const tiers: BreakTier[] = [
    {
      everyPages: Math.max(1, Math.trunc(values.shortBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.shortBreakSeconds)),
      kind: 'micro',
    },
    {
      everyPages: Math.max(1, Math.trunc(values.mediumBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.mediumBreakSeconds)),
      kind: 'short',
    },
    {
      everyPages: Math.max(1, Math.trunc(values.longBreakEveryPages)),
      durationSeconds: Math.max(5, Math.trunc(values.longBreakSeconds)),
      kind: 'long',
    },
  ]

  return tiers.sort((left, right) => right.everyPages - left.everyPages)
}

export function buildReadingIntentOptions(): ReadingIntentOptionView[] {
  return (
    Object.entries(READING_INTENT_META) as Array<
      [ReadingIntent, (typeof READING_INTENT_META)[ReadingIntent]]
    >
  ).map(([value, meta]) => ({
    value,
    label: meta.label,
    detail: meta.detail,
  }))
}

export function getReadingIntentLabel(intent: ReadingIntent): string {
  return READING_INTENT_META[intent].label
}

export function buildNextGoalLabel(intent: ReadingIntent): string {
  return READING_INTENT_META[intent].nextStep
}

export function buildResumeAnchorLabel(
  session: ActiveSession | null,
  context: ReaderContext | null,
): string | null {
  if (context?.pageNumber && context?.verseKey) {
    return `Page ${context.pageNumber}, verse ${context.verseKey}`
  }

  if (context?.pageNumber) {
    return `Page ${context.pageNumber}`
  }

  if (context?.verseKey) {
    return `Verse ${context.verseKey}`
  }

  if (session && session.totalPages > 0) {
    return `${formatPageLabel(session.totalPages)} logged`
  }

  return null
}

export function buildParkForLaterLabel(context: ReaderContext | null): string | null {
  if (!context || context.routeKind === 'unknown') {
    return null
  }

  if (context.verseKey) {
    return 'Park this verse for later'
  }

  if (context.pageNumber) {
    return 'Park this page for later'
  }

  return 'Park this place for later'
}

export function buildStudyLaterEntries(
  items: StudyLaterItem[],
  locale: string,
): StudyLaterItemView[] {
  return [...items]
    .sort((left, right) => right.savedAtMs - left.savedAtMs)
    .map((item) => {
      const title = item.verseKey
        ? `Verse ${item.verseKey}`
        : item.pageNumber
          ? `Page ${item.pageNumber}`
          : 'Saved reading spot'
      const locationParts = [
        item.chapterId ? `Surah ${item.chapterId}` : null,
        item.pageNumber ? `Page ${item.pageNumber}` : null,
        item.hizbNumber ? `Hizb ${item.hizbNumber}` : null,
      ].filter((value): value is string => value !== null)

      return {
        id: item.id,
        title,
        locationLabel: locationParts.join(' · ') || 'Quran.com',
        savedAtLabel: `Saved ${formatSessionDate(item.savedAtMs, locale)} at ${formatTimeStamp(item.savedAtMs, locale)}`,
        intentLabel: item.readingIntent
          ? `During ${getReadingIntentLabel(item.readingIntent)}`
          : undefined,
        openUrl: item.url,
        studyUrl: buildStudyViewUrl(item),
      }
    })
}

function buildStudyViewUrl(item: StudyLaterItem): string | undefined {
  const verseKey = item.verseKey?.trim()
  if (!verseKey) {
    return undefined
  }

  const [chapterFromVerse, verseNumber] = verseKey.split(':')
  const chapterId = chapterFromVerse?.trim() || item.chapterId?.trim() || ''
  const normalizedVerseNumber = verseNumber?.trim() || ''

  if (!chapterId || !normalizedVerseNumber) {
    return undefined
  }

  try {
    const origin = new URL(item.url).origin
    return `${origin}/${chapterId}/${normalizedVerseNumber}`
  } catch {
    return `https://quran.com/${chapterId}/${normalizedVerseNumber}`
  }
}

export function createStudyLaterItem(
  context: ReaderContext | null,
  session: ActiveSession | null,
  nowMs = Date.now(),
): StudyLaterItem | null {
  if (!context || context.routeKind === 'unknown') {
    return null
  }

  const suffix =
    context.verseKey ??
    (context.pageNumber ? `page-${context.pageNumber}` : null) ??
    `${nowMs}`

  return {
    schemaVersion: STUDY_LATER_SCHEMA_VERSION,
    id: `study_${nowMs}_${suffix.replace(/[^a-zA-Z0-9:-]+/g, '-')}`,
    savedAtMs: nowMs,
    sessionId: session?.sessionId ?? null,
    readingIntent: session?.readingIntent ?? null,
    routeKind: context.routeKind,
    url: context.url,
    chapterId: context.chapterId,
    verseKey: context.verseKey,
    pageNumber: context.pageNumber,
    hizbNumber: context.hizbNumber,
  }
}

export function applyCalmFocusDefaults(
  values: SettingsFormValues,
): SettingsFormValues {
  return {
    ...values,
    showBetweenBreakCountdown: false,
    readingPressureMode: false,
    deadlineWarningCueEnabled: false,
    showRestCountdown: false,
    softChime: false,
    preStartCountdownSeconds: values.preStartCountdownSeconds,
    preStartWarningCueEnabled: values.preStartWarningCueEnabled,
    simplifiedReadingPanel: true,
    largeText: true,
    sepiaTheme: true,
  }
}

export function applyPressureFocusDefaults(
  values: SettingsFormValues,
): SettingsFormValues {
  return {
    ...values,
    showBetweenBreakCountdown: true,
    readingPressureMode: true,
    deadlineWarningCueEnabled: true,
    showRestCountdown: true,
    softChime: true,
    preStartWarningCueEnabled: true,
    simplifiedReadingPanel: true,
    largeText: true,
    sepiaTheme: true,
  }
}

export function buildTimeline(
  session: ActiveSession,
  locale: string,
): SessionTimelineEntry[] {
  const items: Array<SessionTimelineEntry & { sortAtMs: number }> = [
    {
      id: `${session.sessionId}-start`,
      title: 'Session started',
      detail: `Intent: ${getReadingIntentLabel(session.readingIntent)}. ${buildNextGoalLabel(session.readingIntent)}`,
      timeLabel: formatTimeStamp(session.startedAtMs, locale),
      tone: 'neutral',
      sortAtMs: session.startedAtMs,
    },
  ]

  for (const pageEvent of session.pageEvents) {
    const sourceLabel =
      pageEvent.source === 'auto' && pageEvent.readerPageNumber !== null
        ? `Auto-tracked Quran.com page ${pageEvent.readerPageNumber}.`
        : `Total progress: ${formatPageLabel(pageEvent.totalPages)}.`

    items.push({
      id: `${session.sessionId}-page-${pageEvent.atMs}-${pageEvent.totalPages}`,
      title: `Logged ${formatPageLabel(pageEvent.deltaPages)}`,
      detail: sourceLabel,
      timeLabel: formatTimeStamp(pageEvent.atMs, locale),
      tone: 'progress',
      sortAtMs: pageEvent.atMs,
    })
  }

  for (const paceWindow of session.paceWindowLog) {
    const lateCopy =
      paceWindow.latePagesAtWindowEnd > 0
        ? ` ${formatPageLabel(paceWindow.latePagesAtWindowEnd)} late at window end.`
        : ''
    const recoveryCopy =
      paceWindow.caughtUpDuringCatchUp && paceWindow.recoveredSecondsRemaining !== null
        ? ` Recovered with ${paceWindow.recoveredSecondsRemaining}s left.`
        : paceWindow.caughtUpDuringCatchUp
          ? ' Recovered during catch-up.'
          : ''
    items.push({
      id: `${session.sessionId}-pace-${paceWindow.resolvedAtMs}-${paceWindow.targetEndPage}`,
      title: paceWindow.missedDeadline ? 'Deadline missed' : 'Window on time',
      detail: `Target page ${paceWindow.targetEndPage}. Score ${paceWindow.score}/10.${lateCopy}${recoveryCopy}`.trim(),
      timeLabel: formatTimeStamp(paceWindow.resolvedAtMs, locale),
      tone: paceWindow.missedDeadline ? 'neutral' : 'progress',
      sortAtMs: paceWindow.resolvedAtMs,
    })
  }

  for (const breakEntry of session.breakLog) {
    const stateLabel = breakEntry.skipped
      ? 'Skipped once.'
      : breakEntry.completedAtMs
        ? 'Completed.'
        : 'Active now.'
    const snoozeLabel =
      breakEntry.snoozeCount > 0 ? ` Snoozed ${breakEntry.snoozeCount}x.` : ''

    items.push({
      id: `${session.sessionId}-break-${breakEntry.triggeredAtMs}`,
      title: formatBreakKind(breakEntry.kind),
      detail: `Triggered at page ${breakEntry.triggerPage}. ${stateLabel}${snoozeLabel}`.trim(),
      timeLabel: formatTimeStamp(
        breakEntry.completedAtMs ?? breakEntry.triggeredAtMs,
        locale,
      ),
      tone: 'rest',
      sortAtMs: breakEntry.completedAtMs ?? breakEntry.triggeredAtMs,
    })
  }

  if (session.status === 'paused') {
    items.push({
      id: `${session.sessionId}-paused-${session.updatedAtMs}`,
      title: 'Session paused',
      detail: 'Take a breath and return when the page feels manageable again.',
      timeLabel: formatTimeStamp(session.updatedAtMs, locale),
      tone: 'neutral',
      sortAtMs: session.updatedAtMs,
    })
  }

  return items
    .sort((left, right) => right.sortAtMs - left.sortAtMs)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      timeLabel: item.timeLabel,
      tone: item.tone,
    }))
}

export function buildHistoryEntries(
  entries: SessionHistoryEntry[],
  locale: string,
): HistoryEntryView[] {
  return [...entries]
    .sort((left, right) => right.startedAtMs - left.startedAtMs)
    .map((entry) => {
      const paceScoreReasons = buildPaceScoreReasons({
        totalWindows: entry.paceWindowLog.length,
        onTimeWindows: entry.onTimeWindows,
        recoveredWindows: entry.recoveredWindows,
        bestOnTimeStreak: entry.bestOnTimeStreak,
        deadlineSnoozeCount: entry.deadlineSnoozeCount,
        latePages: entry.endingLatePages,
      })

      return {
        id: entry.sessionId,
        dateLabel: formatSessionDate(entry.startedAtMs, locale),
        timeRangeLabel: `${formatTimeStamp(entry.startedAtMs, locale)} to ${formatTimeStamp(entry.endedAtMs, locale)}`,
        durationLabel: formatClockDuration((entry.endedAtMs - entry.startedAtMs) / 1000),
        pagesCompleted: entry.totalPages,
        breaksTaken: entry.breaksTaken,
        snoozes: entry.snoozeCount,
        deadlineSnoozes: entry.deadlineSnoozeCount,
        skips: entry.skippedBreaks,
        paceScore: entry.paceScore,
        paceScoreLabel: getPaceScoreLabel(entry.paceScore),
        paceScoreReasons,
        onTimeWindows: entry.onTimeWindows,
        recoveredWindows: entry.recoveredWindows,
        bestOnTimeStreak: entry.bestOnTimeStreak,
        maxLatePages: entry.maxPagesLate,
        endingLatePages: entry.endingLatePages,
        missedBreakWindows: entry.missedBreakWindows,
        notes:
          entry.pressureModeEnabled
            ? `Intent: ${getReadingIntentLabel(entry.readingIntent)}.${entry.maxPagesLate > 0 ? ` Max late pages: ${entry.maxPagesLate}.` : ' Stayed on pace throughout the session.'}`
            : `Intent: ${getReadingIntentLabel(entry.readingIntent)}.`,
      }
    })
}

export function buildCompletedSessionSummary(
  entry: SessionHistoryEntry | null,
): CompletedSessionSummaryView | null {
  if (!entry) {
    return null
  }

  const paceScoreReasons = buildPaceScoreReasons({
    totalWindows: entry.paceWindowLog.length,
    onTimeWindows: entry.onTimeWindows,
    recoveredWindows: entry.recoveredWindows,
    bestOnTimeStreak: entry.bestOnTimeStreak,
    deadlineSnoozeCount: entry.deadlineSnoozeCount,
    latePages: entry.endingLatePages,
  })

  return {
    title: 'Session complete',
    subtitle: entry.pressureModeEnabled
      ? 'Score updates only when a pace window resolves, so it rewards consistency and recovery.'
      : 'This session was saved and added to your history.',
    paceScore: entry.paceScore,
    paceScoreLabel: getPaceScoreLabel(entry.paceScore),
    paceScoreReasons,
    pagesCompleted: entry.totalPages,
    deadlineSnoozes: entry.deadlineSnoozeCount,
    onTimeWindows: entry.onTimeWindows,
    recoveredWindows: entry.recoveredWindows,
    bestOnTimeStreak: entry.bestOnTimeStreak,
    maxLatePages: entry.maxPagesLate,
    endingLatePages: entry.endingLatePages,
    earnedBreaks: entry.breaksTaken,
    missedBreakWindows: entry.missedBreakWindows,
  }
}

export function buildSummaryLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  if (!session || session.status === 'idle') {
    return `Default pace: ${formatClockDuration(settings.paceSecondsPerTwoPages)} for two pages.`
  }

  if (session.activeBreak) {
    return `${formatBreakKind(session.activeBreak.kind)} now.`
  }

  if (session.pressureModeEnabled && session.currentPagesLate > 0) {
    return `${formatPageLabel(session.currentPagesLate)} late. Catch up before the next target.`
  }

  if (session.pressureModeEnabled && session.paceState) {
    return `${formatBreakKind(session.paceState.breakKind)} at page ${session.paceState.targetEndPage}.`
  }

  const nextBreak = getNextBreakHint(session.totalPages, settings.breakTiers)
  if (!nextBreak) {
    return `${formatPageLabel(session.totalPages)} logged.`
  }

  return `${formatBreakKind(nextBreak.kind)} in ${formatPageLabel(nextBreak.pagesUntilBreak)}.`
}

export function buildTrackingLabel(context: ReaderContext | null): string {
  if (!context) {
    return 'Local coach'
  }

  if (context.routeKind === 'unknown') {
    return 'Open a reading view'
  }

  return context.automaticTrackingAvailable ? 'Automatic tracking on' : 'Manual page logging'
}

export function buildTrackingCopy(context: ReaderContext | null): string {
  if (!context) {
    return 'Track pages and breaks here when you are not on Quran.com.'
  }

  if (context.routeKind === 'unknown') {
    return 'Open a reading view for automatic page tracking. You can still log pages manually.'
  }

  if (context.automaticTrackingAvailable) {
    return ''
  }

  return 'This reading view is supported, but page data is unavailable right now. Log a missed page manually if needed.'
}

export function buildNextBreakLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  if (session?.activeBreak) {
    return `${formatBreakKind(session.activeBreak.kind)} now`
  }

  if (session?.pressureModeEnabled && session.paceState) {
    return `${formatBreakKind(session.paceState.breakKind)} at page ${session.paceState.targetEndPage}`
  }

  const nextBreakHint = getNextBreakHint(session?.totalPages ?? 0, settings.breakTiers)
  if (nextBreakHint) {
    return `${formatBreakKind(nextBreakHint.kind)} in ${formatPageLabel(nextBreakHint.pagesUntilBreak)}`
  }

  return 'No break scheduled'
}

export function buildReadingPressureCue(
  session: ActiveSession | null,
  settings: TimerSettings,
  nowMs = Date.now(),
): ReadingPressureCue | null {
  if (!session || session.status !== 'reading' || session.activeBreak) {
    return null
  }

  const exactCountdownVisible =
    settings.showBetweenBreakCountdown || settings.readingPressureMode
  if (!exactCountdownVisible) {
    return null
  }

  if (session.pressureModeEnabled && session.paceState) {
    if (session.paceState.catchUpEndsAtMs !== null) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((session.paceState.catchUpEndsAtMs - nowMs) / 1000),
      )
      return {
        remainingSeconds,
        exactCountdownVisible: true,
        mode: 'catch-up-window',
        phase: remainingSeconds <= 10 ? 'final-ten' : 'none',
        metricLabel: 'Catch-up window',
        displayLabel: remainingSeconds > 0 ? formatClockDuration(remainingSeconds) : 'Now',
        chipSubtitle:
          session.currentPagesLate > 0
            ? `${formatPageLabel(session.currentPagesLate)} late · ${remainingSeconds}s`
            : `Catch-up ${remainingSeconds}s`,
        snoozeAvailable: false,
        pagesLate: session.currentPagesLate,
      }
    }

    const totalWindowSeconds =
      session.paceState.originalDurationSeconds + session.paceState.deadlineSnoozeCount * 10
    const remainingSeconds = Math.max(
      0,
      Math.ceil((session.paceState.deadlineAtMs - nowMs) / 1000),
    )
    const skipsHalfwayPhase = totalWindowSeconds <= 20
    const phase =
      remainingSeconds <= 10
        ? 'final-ten'
        : !skipsHalfwayPhase && remainingSeconds <= Math.ceil(totalWindowSeconds / 2)
          ? 'halfway'
          : 'none'
    const displayLabel =
      phase === 'final-ten'
        ? remainingSeconds > 0
          ? `${remainingSeconds}s left`
          : 'Now'
        : remainingSeconds > 0
          ? formatClockDuration(remainingSeconds)
          : 'Now'

    return {
      remainingSeconds,
      exactCountdownVisible: true,
      mode: 'reading-window',
      phase,
      metricLabel:
        phase === 'halfway'
          ? 'Halfway to deadline'
          : phase === 'final-ten'
            ? 'Final 10 seconds'
            : 'Time to next deadline',
      displayLabel,
      chipSubtitle:
        session.currentPagesLate > 0
          ? `${formatPageLabel(session.currentPagesLate)} late`
          : phase === 'halfway'
            ? `Halfway · ${displayLabel}`
            : phase === 'final-ten'
              ? displayLabel
              : `${displayLabel} left`,
      snoozeAvailable: remainingSeconds > 0 && remainingSeconds <= 10,
      pagesLate: session.currentPagesLate,
    }
  }

  const nextBreakHint = getNextBreakHint(session.totalPages, settings.breakTiers)
  if (!nextBreakHint) {
    return null
  }

  const originalEstimatedSeconds =
    nextBreakHint.pagesUntilBreak * (settings.paceSecondsPerTwoPages / 2)
  const anchorMs = session.lastPageLoggedAtMs ?? session.startedAtMs
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - anchorMs) / 1000))
  const remainingSeconds = Math.max(0, Math.ceil(originalEstimatedSeconds - elapsedSeconds))
  const exactLabel = remainingSeconds > 0 ? formatClockDuration(remainingSeconds) : 'Now'

  if (!settings.readingPressureMode) {
    return {
      remainingSeconds,
      exactCountdownVisible,
      mode: 'reading-window',
      phase: 'none',
      metricLabel: 'Time to next break',
      displayLabel: exactLabel,
      chipSubtitle: remainingSeconds > 0 ? `${exactLabel} left` : 'Now',
      snoozeAvailable: false,
      pagesLate: 0,
    }
  }

  const skipsHalfwayPhase = originalEstimatedSeconds <= 20
  const phase =
    remainingSeconds <= 10
      ? 'final-ten'
      : !skipsHalfwayPhase && remainingSeconds <= Math.ceil(originalEstimatedSeconds / 2)
        ? 'halfway'
        : 'none'

  return {
    remainingSeconds,
    exactCountdownVisible,
    mode: 'reading-window',
    phase,
    metricLabel:
      phase === 'halfway'
        ? 'Halfway to break'
        : phase === 'final-ten'
          ? 'Final 10 seconds'
          : 'Time to next break',
    displayLabel: phase === 'final-ten' && remainingSeconds > 0 ? `${remainingSeconds}s left` : exactLabel,
    chipSubtitle: remainingSeconds > 0 ? `${exactLabel} left` : 'Now',
    snoozeAvailable: false,
    pagesLate: 0,
  }
}

export function buildEstimatedToBreakLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
  nowMs = Date.now(),
): string {
  if (session?.activeBreak) {
    return 'Now'
  }

  const pressureCue = buildReadingPressureCue(session, settings, nowMs)
  if (pressureCue?.exactCountdownVisible) {
    return pressureCue.displayLabel
  }

  const nextBreakHint = getNextBreakHint(session?.totalPages ?? 0, settings.breakTiers)
  if (nextBreakHint) {
    const estimatedSeconds = nextBreakHint.pagesUntilBreak * (settings.paceSecondsPerTwoPages / 2)
    return formatApproxDuration(estimatedSeconds)
  }

  return '--'
}

export function buildPaceHint(
  session: ActiveSession | null,
  settings: TimerSettings,
  nowMs: number,
): string | null {
  if (!session) {
    return null
  }

  if (session.pressureModeEnabled) {
    if (session.currentPagesLate > 0) {
      return `${formatPageLabel(session.currentPagesLate)} late. Finish this page to catch up.`
    }

    if (session.paceWindowLog.length > 0) {
      const reasons = buildPaceScoreReasons(
        {
          totalWindows: session.paceWindowLog.length,
          onTimeWindows: session.onTimeWindows,
          recoveredWindows: session.recoveredWindows,
          bestOnTimeStreak: session.bestOnTimeStreak,
          deadlineSnoozeCount: session.deadlineSnoozeCount,
          latePages: session.currentPagesLate,
        },
        { lateLabel: 'late-now' },
      )
      const suffix = reasons.length > 0 ? ` · ${reasons.join(' · ')}` : ''
      return `Score ${session.paceScore}${suffix}`
    }

    return null
  }

  return computeHybridNudge(session, settings, nowMs)?.message ?? null
}

export function buildResetSettings(nowMs = Date.now()): TimerSettings {
  return createDefaultTimerSettings(nowMs)
}
