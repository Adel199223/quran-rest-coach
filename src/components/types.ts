import type { ReadingIntent } from '../domain'

export type SurfaceKey = 'session' | 'history' | 'settings'

export type SessionStatus = 'idle' | 'reading' | 'paused' | 'break'

export interface SessionTimelineEntry {
  id: string
  title: string
  detail: string
  timeLabel: string
  tone?: 'neutral' | 'rest' | 'progress'
}

export interface HistoryEntryView {
  id: string
  dateLabel: string
  timeRangeLabel: string
  durationLabel: string
  pagesCompleted: number
  breaksTaken: number
  snoozes: number
  deadlineSnoozes: number
  skips: number
  paceScore: number
  paceScoreLabel: string
  paceScoreReasons: string[]
  onTimeWindows: number
  recoveredWindows: number
  bestOnTimeStreak: number
  maxLatePages: number
  endingLatePages: number
  missedBreakWindows: number
  notes?: string
}

export interface StudyLaterItemView {
  id: string
  title: string
  locationLabel: string
  savedAtLabel: string
  intentLabel?: string
  openUrl: string
  studyUrl?: string
}

export interface ReadingIntentOptionView {
  value: ReadingIntent
  label: string
  detail: string
}

export type ReadingPressurePhase = 'none' | 'halfway' | 'final-ten'
export type ReadingPressureMode = 'reading-window' | 'catch-up-window'

export interface ReadingPressureCue {
  remainingSeconds: number
  exactCountdownVisible: boolean
  mode: ReadingPressureMode
  phase: ReadingPressurePhase
  metricLabel: string
  displayLabel: string
  chipSubtitle: string
  snoozeAvailable: boolean
  pagesLate: number
}

export interface CompletedSessionSummaryView {
  title: string
  subtitle: string
  paceScore: number
  paceScoreLabel: string
  paceScoreReasons: string[]
  pagesCompleted: number
  deadlineSnoozes: number
  onTimeWindows: number
  recoveredWindows: number
  bestOnTimeStreak: number
  maxLatePages: number
  endingLatePages: number
  earnedBreaks: number
  missedBreakWindows: number
}

export interface PendingStartView {
  remainingSeconds: number
  warningPhase: boolean
  intentLabel: string
}

export interface SettingsFormValues {
  paceSecondsPerTwoPages: number
  shortBreakEveryPages: number
  shortBreakSeconds: number
  mediumBreakEveryPages: number
  mediumBreakSeconds: number
  longBreakEveryPages: number
  longBreakSeconds: number
  showBetweenBreakCountdown: boolean
  readingPressureMode: boolean
  deadlineWarningCueEnabled: boolean
  showRestCountdown: boolean
  softChime: boolean
  preStartCountdownSeconds: number
  preStartWarningCueEnabled: boolean
  simplifiedReadingPanel: boolean
  reducedMotion: boolean
  largeText: boolean
  highContrast: boolean
  sepiaTheme: boolean
  resumeOnReopen: boolean
}
