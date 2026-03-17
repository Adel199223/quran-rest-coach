import type {
  ActiveSession,
  BreakKind,
  BreakTier,
  ReaderContext,
  SessionHistoryEntry,
  TimerSettings,
} from '../domain'
import {
  computeHybridNudge,
  createDefaultTimerSettings,
  getNextBreakHint,
} from '../domain'
import type {
  HistoryEntryView,
  SessionTimelineEntry,
  SettingsFormValues,
} from '../components'
import {
  formatBreakKind,
  formatClockDuration,
  formatPageLabel,
  formatSessionDate,
  formatTimeStamp,
} from '../lib/format'

export const BREAK_SUGGESTIONS: Record<BreakKind, string> = {
  micro: 'Blink slowly, unclench your jaw, and let your eyes soften.',
  short: 'Look across the room and let your breathing settle before continuing.',
  long: 'Stand up, stretch, and return only when your focus feels lighter.',
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
      return 'Reading'
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
    softChime: settings.softChimeEnabled,
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

export function buildTimeline(
  session: ActiveSession,
  locale: string,
): SessionTimelineEntry[] {
  const items: Array<SessionTimelineEntry & { sortAtMs: number }> = [
    {
      id: `${session.sessionId}-start`,
      title: 'Session started',
      detail: 'You can keep logging pages and let the app handle the rest cues.',
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
    .map((entry) => ({
      id: entry.sessionId,
      dateLabel: formatSessionDate(entry.startedAtMs, locale),
      timeRangeLabel: `${formatTimeStamp(entry.startedAtMs, locale)} to ${formatTimeStamp(entry.endedAtMs, locale)}`,
      durationLabel: formatClockDuration((entry.endedAtMs - entry.startedAtMs) / 1000),
      pagesCompleted: entry.totalPages,
      breaksTaken: entry.breaksTaken,
      snoozes: entry.snoozeCount,
      skips: entry.skippedBreaks,
      notes:
        entry.observedPages.length > 0
          ? 'Includes Quran.com auto-tracked progress.'
          : entry.skippedBreaks > 0
            ? 'One or more break prompts were skipped before the session ended.'
            : undefined,
    }))
}

export function buildSummaryLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  if (!session || session.status === 'idle') {
    return `Default pace: ${formatClockDuration(settings.paceSecondsPerTwoPages)} for two pages.`
  }

  if (session.activeBreak) {
    return `${formatBreakKind(session.activeBreak.kind)} underway.`
  }

  const nextBreak = getNextBreakHint(session.totalPages, settings.breakTiers)
  if (!nextBreak) {
    return `${formatPageLabel(session.totalPages)} logged.`
  }

  return `${formatBreakKind(nextBreak.kind)} at page ${nextBreak.triggerPage}.`
}

export function buildTrackingLabel(context: ReaderContext | null): string {
  if (!context) {
    return 'Standalone mode'
  }

  return context.automaticTrackingAvailable ? 'Automatic tracking live' : 'Manual fallback'
}

export function buildTrackingCopy(context: ReaderContext | null): string {
  if (!context) {
    return 'Use the local coach to manage breaks outside the browser extension flow.'
  }

  if (context.automaticTrackingAvailable) {
    return 'This Quran.com view exposes stable page metadata, so progress can be tracked automatically.'
  }

  return 'This Quran.com view is recognized, but page metadata is not available right now. Manual page controls stay available.'
}

export function buildNextBreakLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  const nextBreakHint = getNextBreakHint(session?.totalPages ?? 0, settings.breakTiers)
  if (session?.activeBreak) {
    return `${formatBreakKind(session.activeBreak.kind)} now`
  }

  if (nextBreakHint) {
    return `${formatBreakKind(nextBreakHint.kind)} at page ${nextBreakHint.triggerPage}`
  }

  return 'No break scheduled'
}

export function buildEstimatedToBreakLabel(
  session: ActiveSession | null,
  settings: TimerSettings,
): string {
  const nextBreakHint = getNextBreakHint(session?.totalPages ?? 0, settings.breakTiers)

  if (session?.activeBreak) {
    return 'Now'
  }

  if (nextBreakHint) {
    return `~${formatClockDuration(
      nextBreakHint.pagesUntilBreak * (settings.paceSecondsPerTwoPages / 2),
    )}`
  }

  return '--'
}

export function buildPaceHint(
  session: ActiveSession | null,
  settings: TimerSettings,
  nowMs: number,
): string | null {
  return session ? computeHybridNudge(session, settings, nowMs)?.message ?? null : null
}

export function buildResetSettings(nowMs = Date.now()): TimerSettings {
  return createDefaultTimerSettings(nowMs)
}
