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
  skips: number
  notes?: string
}

export interface SettingsFormValues {
  paceSecondsPerTwoPages: number
  shortBreakEveryPages: number
  shortBreakSeconds: number
  mediumBreakEveryPages: number
  mediumBreakSeconds: number
  longBreakEveryPages: number
  longBreakSeconds: number
  softChime: boolean
  reducedMotion: boolean
  largeText: boolean
  highContrast: boolean
  sepiaTheme: boolean
  resumeOnReopen: boolean
}
