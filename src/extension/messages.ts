import type {
  CoachExportData,
  ObservedReaderPage,
  ReaderContext,
  ReadingIntent,
  SessionHistoryEntry,
  TimerSettings,
} from '../domain'

export type SessionCommand =
  | { type: 'open-side-panel' }
  | { type: 'get-side-panel-visibility' }
  | { type: 'set-side-panel-visibility'; open: boolean }
  | { type: 'start-session'; intent?: ReadingIntent }
  | { type: 'add-pages'; pages: number }
  | { type: 'tick-session' }
  | { type: 'undo-last-pages' }
  | { type: 'snooze-reading-deadline' }
  | { type: 'toggle-pause' }
  | { type: 'resume-break' }
  | { type: 'snooze-break'; seconds: number }
  | { type: 'skip-break' }
  | { type: 'end-session' }
  | { type: 'update-settings'; settings: TimerSettings }
  | { type: 'reset-settings' }
  | { type: 'reset-history' }
  | { type: 'discard-active-session' }
  | { type: 'export-data' }
  | { type: 'import-data'; payload: string }

export type ExtensionMessage =
  | {
      kind: 'reader-context:update'
      context: ReaderContext
    }
  | {
      kind: 'reader-page:observed'
      observation: ObservedReaderPage
    }
  | {
      kind: 'session-command'
      command: SessionCommand
    }

export interface ExtensionCommandResult {
  ok: boolean
  error?: string
  exportData?: CoachExportData
  historyEntry?: SessionHistoryEntry | null
  panelOpen?: boolean
}
